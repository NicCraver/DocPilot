//! 基于 lopdf 官方 merge 示例的 PDF 合并与按页拆分（无书签层）

use lopdf::{Document, Object, ObjectId};
use std::collections::BTreeMap;
use std::path::Path;

#[derive(Debug, Clone, serde::Serialize)]
pub struct PdfInfo {
    pub page_count: u32,
    pub file_size: u64,
    pub version: String,
}

pub fn get_pdf_info(input_path: &str) -> Result<PdfInfo, String> {
    if !Path::new(input_path).exists() {
        return Err(format!("文件不存在: {input_path}"));
    }
    let file_size = std::fs::metadata(input_path)
        .map_err(|e| format!("读取文件大小失败: {e}"))?
        .len();
    let doc = Document::load(input_path).map_err(|e| format!("加载 PDF 失败: {e}"))?;
    Ok(PdfInfo {
        page_count: doc.get_pages().len() as u32,
        file_size,
        version: doc.version.clone(),
    })
}

/// 按 1-based 页码列表提取子集并保存
pub fn extract_pages_by_numbers(
    input_path: &str,
    output_path: &str,
    page_numbers: &[u32],
) -> Result<u32, String> {
    if page_numbers.is_empty() {
        return Err("页码列表不能为空".into());
    }
    let doc = Document::load(input_path).map_err(|e| format!("加载 PDF 失败: {e}"))?;
    let pages = doc.get_pages();
    let total = pages.len() as u32;
    for n in page_numbers {
        if *n < 1 || *n > total {
            return Err(format!("页码 {n} 无效（文档共 {total} 页）"));
        }
    }
    let keep: BTreeMap<u32, ObjectId> = page_numbers
        .iter()
        .filter_map(|n| pages.get(n).map(|id| (*n, *id)))
        .collect();
    save_subset(&doc, keep, output_path)
}

pub fn delete_pages(
    input_path: &str,
    output_path: &str,
    pages_to_delete: &[u32],
) -> Result<u32, String> {
    let doc = Document::load(input_path).map_err(|e| format!("加载 PDF 失败: {e}"))?;
    let pages = doc.get_pages();
    let total = pages.len() as u32;
    let delete_set: std::collections::HashSet<u32> = pages_to_delete.iter().copied().collect();
    let keep: BTreeMap<u32, ObjectId> = pages
        .into_iter()
        .filter(|(n, _)| !delete_set.contains(n))
        .collect();
    if keep.is_empty() {
        return Err("不能删除全部页面".into());
    }
    if keep.len() as u32 == total {
        return Err("没有指定要删除的页".into());
    }
    save_subset(&doc, keep, output_path)
}

pub fn reorder_pages(
    input_path: &str,
    output_path: &str,
    new_order: &[u32],
) -> Result<u32, String> {
    let doc = Document::load(input_path).map_err(|e| format!("加载 PDF 失败: {e}"))?;
    let pages = doc.get_pages();
    let total = pages.len() as u32;
    if new_order.len() as u32 != total {
        return Err(format!("新顺序须包含全部 {total} 页"));
    }
    let mut seen = std::collections::HashSet::new();
    let mut keep = BTreeMap::new();
    for (idx, n) in new_order.iter().enumerate() {
        if *n < 1 || *n > total {
            return Err(format!("页码 {n} 无效"));
        }
        if !seen.insert(*n) {
            return Err(format!("页码 {n} 重复"));
        }
        if let Some(id) = pages.get(n) {
            keep.insert((idx + 1) as u32, *id);
        }
    }
    save_subset(&doc, keep, output_path)
}

pub fn rotate_pages(
    input_path: &str,
    output_path: &str,
    page_numbers: Option<Vec<u32>>,
    degrees: i32,
) -> Result<u32, String> {
    let rotation = match degrees {
        90 | 180 | 270 => degrees,
        other => return Err(format!("旋转角度须为 90/180/270，收到 {other}")),
    };
    let mut doc = Document::load(input_path).map_err(|e| format!("加载 PDF 失败: {e}"))?;
    let pages = doc.get_pages();
    let total = pages.len() as u32;
    let targets: Vec<u32> = match page_numbers {
        Some(nums) => {
            for n in &nums {
                if *n < 1 || *n > total {
                    return Err(format!("页码 {n} 无效（共 {total} 页）"));
                }
            }
            nums
        }
        None => pages.keys().copied().collect(),
    };
    for n in &targets {
        if let Some(&oid) = pages.get(n) {
            if let Ok(obj) = doc.get_object_mut(oid) {
                if let Ok(dict) = obj.as_dict_mut() {
                    let current = dict
                        .get(b"Rotate")
                        .ok()
                        .and_then(|o| o.as_i64().ok())
                        .unwrap_or(0) as i32;
                    dict.set("Rotate", (current + rotation) % 360);
                }
            }
        }
    }
    doc.save(output_path)
        .map_err(|e| format!("保存 PDF 失败: {e}"))?;
    Ok(targets.len() as u32)
}

pub fn write_blank_pdf(path: &str, page_count: u32) -> Result<(), String> {
    use lopdf::dictionary;
    if page_count == 0 {
        return Err("空白页数量须大于 0".into());
    }
    let mut page_ids = Vec::new();
    let mut doc = Document::with_version("1.5");
    let pages_id = doc.new_object_id();
    for _ in 0..page_count {
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "MediaBox" => vec![0.into(), 0.into(), 595.into(), 842.into()],
        });
        page_ids.push(page_id.into());
    }
    let pages = dictionary! {
        "Type" => "Pages",
        "Kids" => page_ids,
        "Count" => page_count,
    };
    doc.objects.insert(pages_id, Object::Dictionary(pages));
    let catalog_id = doc.add_object(dictionary! {
        "Type" => "Catalog",
        "Pages" => pages_id,
    });
    doc.trailer.set("Root", catalog_id);
    doc.save(path).map_err(|e| format!("保存空白 PDF 失败: {e}"))?;
    Ok(())
}

fn merge_paths_or_copy(paths: &[String], output_path: &str) -> Result<u32, String> {
    if paths.is_empty() {
        return Err("没有可合并的文件".into());
    }
    if paths.len() == 1 {
        std::fs::copy(&paths[0], output_path)
            .map_err(|e| format!("复制文件失败: {e}"))?;
        return get_pdf_info(output_path).map(|i| i.page_count);
    }
    merge_pdf_files(paths, output_path)
}

pub fn add_blank_pages(
    input_path: &str,
    output_path: &str,
    count: u32,
    after_page: u32,
) -> Result<u32, String> {
    if count == 0 {
        return Err("空白页数量须大于 0".into());
    }
    let total = get_pdf_info(input_path)?.page_count;
    if after_page > total {
        return Err(format!("插入位置无效（共 {total} 页）"));
    }
    let dir = tempfile::tempdir().map_err(|e| format!("创建临时目录失败: {e}"))?;
    let blank = dir.path().join("blank.pdf");
    write_blank_pdf(blank.to_str().unwrap(), count)?;

    let mut paths: Vec<String> = Vec::new();
    if after_page > 0 {
        let before = dir.path().join("before.pdf");
        split_pdf_file(input_path, before.to_str().unwrap(), 1, after_page)?;
        paths.push(before.to_str().unwrap().to_string());
    }
    paths.push(blank.to_str().unwrap().to_string());
    if after_page < total {
        let after = dir.path().join("after.pdf");
        split_pdf_file(input_path, after.to_str().unwrap(), after_page + 1, total)?;
        paths.push(after.to_str().unwrap().to_string());
    }
    merge_paths_or_copy(&paths, output_path)
}

pub fn duplicate_page(
    input_path: &str,
    output_path: &str,
    page_number: u32,
    times: u32,
) -> Result<u32, String> {
    if times == 0 {
        return Err("复制次数须大于 0".into());
    }
    let total = get_pdf_info(input_path)?.page_count;
    if page_number < 1 || page_number > total {
        return Err(format!("页码无效（共 {total} 页）"));
    }
    let dir = tempfile::tempdir().map_err(|e| format!("创建临时目录失败: {e}"))?;
    let target = dir.path().join("target.pdf");
    split_pdf_file(
        input_path,
        target.to_str().unwrap(),
        page_number,
        page_number,
    )?;

    let mut paths: Vec<String> = Vec::new();
    if page_number > 1 {
        let before = dir.path().join("before.pdf");
        split_pdf_file(input_path, before.to_str().unwrap(), 1, page_number - 1)?;
        paths.push(before.to_str().unwrap().to_string());
    }
    for _ in 0..=times {
        paths.push(target.to_str().unwrap().to_string());
    }
    if page_number < total {
        let after = dir.path().join("after.pdf");
        split_pdf_file(input_path, after.to_str().unwrap(), page_number + 1, total)?;
        paths.push(after.to_str().unwrap().to_string());
    }
    merge_paths_or_copy(&paths, output_path)
}

fn save_subset(doc: &Document, keep: BTreeMap<u32, ObjectId>, output_path: &str) -> Result<u32, String> {
    if keep.is_empty() {
        return Err("没有选中任何页".into());
    }
    let max_id = 1u32;
    let mut documents_pages: BTreeMap<ObjectId, Object> = BTreeMap::new();
    let mut documents_objects: BTreeMap<ObjectId, Object> = BTreeMap::new();

    let mut doc = doc.clone();
    doc.renumber_objects_with(max_id);

    for object_id in keep.into_values() {
        let obj = doc
            .get_object(object_id)
            .map_err(|e| format!("读取页对象失败: {e}"))?
            .to_owned();
        documents_pages.insert(object_id, obj);
    }
    documents_objects.extend(doc.objects);

    let mut document = Document::with_version("1.5");
    let mut catalog_object: Option<(ObjectId, Object)> = None;
    let mut pages_object: Option<(ObjectId, Object)> = None;

    for (object_id, object) in documents_objects {
        match object.type_name().unwrap_or(b"") {
            b"Catalog" => {
                catalog_object = Some((
                    catalog_object.map(|(id, _)| id).unwrap_or(object_id),
                    object,
                ));
            }
            b"Pages" => {
                if let Ok(dictionary) = object.as_dict() {
                    let mut dictionary = dictionary.clone();
                    if let Some((_, ref old)) = pages_object {
                        if let Ok(old_dictionary) = old.as_dict() {
                            dictionary.extend(old_dictionary);
                        }
                    }
                    pages_object = Some((
                        pages_object.map(|(id, _)| id).unwrap_or(object_id),
                        Object::Dictionary(dictionary),
                    ));
                }
            }
            b"Page" | b"Outlines" | b"Outline" => {}
            _ => {
                document.objects.insert(object_id, object);
            }
        }
    }

    let (catalog_id, catalog_object) = catalog_object.ok_or("未找到 Catalog 根节点")?;
    let (page_id, page_object) = pages_object.ok_or("未找到 Pages 根节点")?;

    if let Ok(dictionary) = page_object.as_dict() {
        let mut dictionary = dictionary.clone();
        dictionary.set("Count", documents_pages.len() as u32);
        dictionary.set(
            "Kids",
            documents_pages
                .keys()
                .map(|&id| Object::Reference(id))
                .collect::<Vec<_>>(),
        );
        document.objects.insert(page_id, Object::Dictionary(dictionary));
    }

    for (object_id, object) in documents_pages.iter() {
        if let Ok(dictionary) = object.as_dict() {
            let mut dictionary = dictionary.clone();
            dictionary.set("Parent", page_id);
            document
                .objects
                .insert(*object_id, Object::Dictionary(dictionary));
        }
    }

    if let Ok(dictionary) = catalog_object.as_dict() {
        let mut dictionary = dictionary.clone();
        dictionary.set("Pages", page_id);
        dictionary.remove(b"Outlines");
        document
            .objects
            .insert(catalog_id, Object::Dictionary(dictionary));
    }

    document.trailer.set("Root", catalog_id);
    document.max_id = document.objects.len() as u32;
    document.renumber_objects();

    let count = document.get_pages().len() as u32;
    document
        .save(output_path)
        .map_err(|e| format!("保存 PDF 失败: {e}"))?;
    Ok(count)
}

fn build_merged_document(docs: Vec<Document>) -> Result<Document, String> {
    if docs.is_empty() {
        return Err("没有可合并的 PDF".into());
    }

    let mut max_id = 1u32;
    let mut documents_pages: BTreeMap<ObjectId, Object> = BTreeMap::new();
    let mut documents_objects: BTreeMap<ObjectId, Object> = BTreeMap::new();
    let mut document = Document::with_version("1.5");

    for mut doc in docs {
        doc.renumber_objects_with(max_id);
        max_id = doc.max_id + 1;

        for object_id in doc.get_pages().into_values() {
            let obj = doc
                .get_object(object_id)
                .map_err(|e| format!("读取页对象失败: {e}"))?
                .to_owned();
            documents_pages.insert(object_id, obj);
        }
        documents_objects.extend(doc.objects);
    }

    let mut catalog_object: Option<(ObjectId, Object)> = None;
    let mut pages_object: Option<(ObjectId, Object)> = None;

    for (object_id, object) in documents_objects {
        match object.type_name().unwrap_or(b"") {
            b"Catalog" => {
                catalog_object = Some((
                    catalog_object.map(|(id, _)| id).unwrap_or(object_id),
                    object,
                ));
            }
            b"Pages" => {
                if let Ok(dictionary) = object.as_dict() {
                    let mut dictionary = dictionary.clone();
                    if let Some((_, ref old)) = pages_object {
                        if let Ok(old_dictionary) = old.as_dict() {
                            dictionary.extend(old_dictionary);
                        }
                    }
                    pages_object = Some((
                        pages_object.map(|(id, _)| id).unwrap_or(object_id),
                        Object::Dictionary(dictionary),
                    ));
                }
            }
            b"Page" | b"Outlines" | b"Outline" => {}
            _ => {
                document.objects.insert(object_id, object);
            }
        }
    }

    let (catalog_id, catalog_object) = catalog_object.ok_or("未找到 Catalog 根节点")?;
    let (page_id, page_object) = pages_object.ok_or("未找到 Pages 根节点")?;

    if let Ok(dictionary) = page_object.as_dict() {
        let mut dictionary = dictionary.clone();
        dictionary.set("Count", documents_pages.len() as u32);
        dictionary.set(
            "Kids",
            documents_pages
                .keys()
                .map(|&id| Object::Reference(id))
                .collect::<Vec<_>>(),
        );
        document.objects.insert(page_id, Object::Dictionary(dictionary));
    }

    for (object_id, object) in documents_pages.iter() {
        if let Ok(dictionary) = object.as_dict() {
            let mut dictionary = dictionary.clone();
            dictionary.set("Parent", page_id);
            document
                .objects
                .insert(*object_id, Object::Dictionary(dictionary));
        }
    }

    if let Ok(dictionary) = catalog_object.as_dict() {
        let mut dictionary = dictionary.clone();
        dictionary.set("Pages", page_id);
        dictionary.remove(b"Outlines");
        document
            .objects
            .insert(catalog_id, Object::Dictionary(dictionary));
    }

    document.trailer.set("Root", catalog_id);
    document.max_id = document.objects.len() as u32;
    document.renumber_objects();

    Ok(document)
}

/// 合并多个 PDF 到输出路径，返回总页数
pub fn merge_pdf_files(input_paths: &[String], output_path: &str) -> Result<u32, String> {
    if input_paths.len() < 2 {
        return Err("至少需要 2 个 PDF 文件".into());
    }
    let mut docs = Vec::new();
    for p in input_paths {
        if !Path::new(p).exists() {
            return Err(format!("文件不存在: {p}"));
        }
        docs.push(
            Document::load(p).map_err(|e| format!("加载 PDF 失败 ({p}): {e}"))?,
        );
    }
    let page_count = docs.iter().map(|d| d.get_pages().len() as u32).sum();
    let mut document = build_merged_document(docs)?;
    document
        .save(output_path)
        .map_err(|e| format!("保存合并 PDF 失败: {e}"))?;
    Ok(page_count)
}

/// 按页码范围拆分 PDF（1-based，含首尾）
pub fn split_pdf_file(
    input_path: &str,
    output_path: &str,
    start_page: u32,
    end_page: u32,
) -> Result<u32, String> {
    if !Path::new(input_path).exists() {
        return Err(format!("文件不存在: {input_path}"));
    }
    let doc = Document::load(input_path).map_err(|e| format!("加载 PDF 失败: {e}"))?;
    let pages = doc.get_pages();
    let total = pages.len() as u32;
    if start_page < 1 || end_page < start_page || end_page > total {
        return Err(format!("页码范围无效（文档共 {total} 页）"));
    }

    let keep: BTreeMap<u32, ObjectId> = pages
        .into_iter()
        .filter(|(n, _)| *n >= start_page && *n <= end_page)
        .collect();

    if keep.is_empty() {
        return Err("没有选中任何页".into());
    }

    let max_id = 1u32;
    let mut documents_pages: BTreeMap<ObjectId, Object> = BTreeMap::new();
    let mut documents_objects: BTreeMap<ObjectId, Object> = BTreeMap::new();

    let mut doc = doc;
    doc.renumber_objects_with(max_id);

    for object_id in keep.into_values() {
        let obj = doc
            .get_object(object_id)
            .map_err(|e| format!("读取页对象失败: {e}"))?
            .to_owned();
        documents_pages.insert(object_id, obj);
    }
    documents_objects.extend(doc.objects);

    let mut document = Document::with_version("1.5");
    let mut catalog_object: Option<(ObjectId, Object)> = None;
    let mut pages_object: Option<(ObjectId, Object)> = None;

    for (object_id, object) in documents_objects {
        match object.type_name().unwrap_or(b"") {
            b"Catalog" => {
                catalog_object = Some((
                    catalog_object.map(|(id, _)| id).unwrap_or(object_id),
                    object,
                ));
            }
            b"Pages" => {
                if let Ok(dictionary) = object.as_dict() {
                    let mut dictionary = dictionary.clone();
                    if let Some((_, ref old)) = pages_object {
                        if let Ok(old_dictionary) = old.as_dict() {
                            dictionary.extend(old_dictionary);
                        }
                    }
                    pages_object = Some((
                        pages_object.map(|(id, _)| id).unwrap_or(object_id),
                        Object::Dictionary(dictionary),
                    ));
                }
            }
            b"Page" | b"Outlines" | b"Outline" => {}
            _ => {
                document.objects.insert(object_id, object);
            }
        }
    }

    let (catalog_id, catalog_object) = catalog_object.ok_or("未找到 Catalog 根节点")?;
    let (page_id, page_object) = pages_object.ok_or("未找到 Pages 根节点")?;

    if let Ok(dictionary) = page_object.as_dict() {
        let mut dictionary = dictionary.clone();
        dictionary.set("Count", documents_pages.len() as u32);
        dictionary.set(
            "Kids",
            documents_pages
                .keys()
                .map(|&id| Object::Reference(id))
                .collect::<Vec<_>>(),
        );
        document.objects.insert(page_id, Object::Dictionary(dictionary));
    }

    for (object_id, object) in documents_pages.iter() {
        if let Ok(dictionary) = object.as_dict() {
            let mut dictionary = dictionary.clone();
            dictionary.set("Parent", page_id);
            document
                .objects
                .insert(*object_id, Object::Dictionary(dictionary));
        }
    }

    if let Ok(dictionary) = catalog_object.as_dict() {
        let mut dictionary = dictionary.clone();
        dictionary.set("Pages", page_id);
        dictionary.remove(b"Outlines");
        document
            .objects
            .insert(catalog_id, Object::Dictionary(dictionary));
    }

    document.trailer.set("Root", catalog_id);
    document.max_id = document.objects.len() as u32;
    document.renumber_objects();

    let count = document.get_pages().len() as u32;
    document
        .save(output_path)
        .map_err(|e| format!("保存拆分 PDF 失败: {e}"))?;
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;
    use lopdf::dictionary;

    fn write_sample_pdf(path: &std::path::Path) {
        let mut doc = lopdf::Document::with_version("1.4");
        let pages_id = doc.new_object_id();
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
        });
        let pages = dictionary! {
            "Type" => "Pages",
            "Kids" => vec![page_id.into()],
            "Count" => 1,
        };
        doc.objects.insert(pages_id, lopdf::Object::Dictionary(pages));
        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });
        doc.trailer.set("Root", catalog_id);
        doc.save(path).unwrap();
    }

    #[test]
    fn merge_two_pdfs() {
        let dir = tempfile::tempdir().unwrap();
        let a = dir.path().join("a.pdf");
        let b = dir.path().join("b.pdf");
        let out = dir.path().join("merged.pdf");
        write_sample_pdf(&a);
        write_sample_pdf(&b);
        let pages = merge_pdf_files(
            &[a.to_str().unwrap().into(), b.to_str().unwrap().into()],
            out.to_str().unwrap(),
        )
        .unwrap();
        assert_eq!(pages, 2);
        assert!(out.exists());
    }

    #[test]
    fn split_page_range() {
        let dir = tempfile::tempdir().unwrap();
        let a = dir.path().join("a.pdf");
        let b = dir.path().join("b.pdf");
        let merged = dir.path().join("m.pdf");
        let split = dir.path().join("s.pdf");
        write_sample_pdf(&a);
        write_sample_pdf(&b);
        merge_pdf_files(
            &[a.to_str().unwrap().into(), b.to_str().unwrap().into()],
            merged.to_str().unwrap(),
        )
        .unwrap();
        let n = split_pdf_file(merged.to_str().unwrap(), split.to_str().unwrap(), 1, 1).unwrap();
        assert_eq!(n, 1);
        assert!(split.exists());
    }
}

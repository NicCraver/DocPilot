use crate::tools::{
    compress_pdf::CompressPdf,
    extra::{
        AddBlankPages, ComputeHash, CompressImage, ConvertImage, CopyFile, CropImage, DeletePages,
        DuplicatePage, ExtractPages, GetFileInfo, GetImageInfo, GetPdfInfo, ImagesToPdf,
        ConvertToMarkdown, FormatDocxBatch, FormatDocxText, MergeImages, MoveFile, ReorderPages,
        ResizeImage, RotateImage, RotatePdf, TextToPdf,
    },
    merge_pdf::MergePdf,
    split_pdf::SplitPdf,
    ToolInput, ToolOutput, ToolRegistry, ToolSchema,
};
use tauri::State;
use tauri::Manager;

pub fn build_registry() -> ToolRegistry {
    let mut reg = ToolRegistry::new();
    reg.register(Box::new(CompressPdf));
    reg.register(Box::new(MergePdf));
    reg.register(Box::new(SplitPdf));
    reg.register(Box::new(GetPdfInfo));
    reg.register(Box::new(RotatePdf));
    reg.register(Box::new(ExtractPages));
    reg.register(Box::new(DeletePages));
    reg.register(Box::new(ReorderPages));
    reg.register(Box::new(AddBlankPages));
    reg.register(Box::new(DuplicatePage));
    reg.register(Box::new(GetImageInfo));
    reg.register(Box::new(CompressImage));
    reg.register(Box::new(ResizeImage));
    reg.register(Box::new(ConvertImage));
    reg.register(Box::new(CropImage));
    reg.register(Box::new(RotateImage));
    reg.register(Box::new(MergeImages));
    reg.register(Box::new(ImagesToPdf));
    reg.register(Box::new(TextToPdf));
    reg.register(Box::new(GetFileInfo));
    reg.register(Box::new(ComputeHash));
    reg.register(Box::new(CopyFile));
    reg.register(Box::new(MoveFile));
    reg.register(Box::new(ConvertToMarkdown));
    reg.register(Box::new(FormatDocxBatch));
    reg.register(Box::new(FormatDocxText));
    reg
}

pub struct AppState {
    pub registry: ToolRegistry,
}

#[tauri::command]
pub fn list_tools(state: State<'_, AppState>) -> Vec<ToolSchema> {
    state.registry.list()
}

#[tauri::command]
pub async fn run_tool(
    state: State<'_, AppState>,
    id: String,
    input: ToolInput,
) -> Result<ToolOutput, String> {
    state
        .registry
        .run(&id, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_files_in_dir(dir: String, extensions: Vec<String>) -> Result<Vec<String>, String> {
    let exts: Vec<String> = extensions.iter().map(|e| e.to_lowercase()).collect();
    let mut paths = Vec::new();
    let entries = std::fs::read_dir(&dir).map_err(|e| format!("无法读取目录: {e}"))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| s.to_lowercase());
        let Some(ext) = ext else { continue };
        if !exts.contains(&ext) {
            continue;
        }
        paths.push(path.to_string_lossy().into_owned());
    }
    paths.sort();
    Ok(paths)
}

#[tauri::command]
pub fn path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[tauri::command]
pub fn typeset_read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("读取配置失败: {e}"))
}

#[tauri::command]
pub fn typeset_write_text_file(path: String, content: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {e}"))?;
    }
    std::fs::write(p, content).map_err(|e| format!("写入配置失败: {e}"))
}

#[tauri::command]
pub fn list_docx_in_dir(dir: String, recursive: bool) -> Result<Vec<String>, String> {
    let root = std::path::Path::new(&dir);
    if !root.is_dir() {
        return Err(format!("不是有效目录: {dir}"));
    }

    let mut paths = Vec::new();
    collect_docx(root, recursive, &mut paths)?;
    paths.sort();
    Ok(paths)
}

fn collect_docx(dir: &std::path::Path, recursive: bool, out: &mut Vec<String>) -> Result<(), String> {
    let entries = std::fs::read_dir(dir).map_err(|e| format!("无法读取目录: {e}"))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if path
                .extension()
                .and_then(|s| s.to_str())
                .map(|s| s.eq_ignore_ascii_case("docx"))
                .unwrap_or(false)
            {
                out.push(path.to_string_lossy().into_owned());
            }
        } else if recursive && path.is_dir() {
            collect_docx(&path, true, out)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn format_docx_batch(
    input_paths: Vec<String>,
    config: serde_json::Value,
    in_place: bool,
) -> Result<crate::tools::word_typeset_util::TypesetBatchResult, String> {
    if input_paths.is_empty() {
        return Err("文件列表为空".into());
    }
    let payload = serde_json::json!({
        "mode": "batch",
        "input_paths": input_paths,
        "config": config,
        "in_place": in_place,
    });
    crate::tools::word_typeset_util::run_word_typeset(payload)
}

#[tauri::command]
pub async fn generate_word_from_template(
    template_path: String,
    output_path: String,
    content_path: Option<String>,
    content_text: Option<String>,
    content_kind: Option<String>,
    reporter: Option<String>,
    report_date: Option<String>,
) -> Result<crate::tools::word_typeset_util::TypesetBatchResult, String> {
    if content_path.as_ref().is_none_or(|p| p.trim().is_empty())
        && content_text.as_ref().is_none_or(|t| t.trim().is_empty())
    {
        return Err("请上传内容文件或输入文本".into());
    }
    let payload = serde_json::json!({
        "template_path": template_path,
        "output_path": output_path,
        "content_path": content_path,
        "content_text": content_text,
        "content_kind": content_kind.unwrap_or_else(|| "text".into()),
        "reporter": reporter,
        "report_date": report_date,
    });
    crate::tools::word_template_util::run_word_template_fill(payload)
}

#[tauri::command]
pub async fn format_docx_text(
    text: String,
    output_path: String,
    config: serde_json::Value,
) -> Result<crate::tools::word_typeset_util::TypesetBatchResult, String> {
    let payload = serde_json::json!({
        "mode": "text",
        "text": text,
        "output_path": output_path,
        "config": config,
    });
    crate::tools::word_typeset_util::run_word_typeset(payload)
}

fn smart_doc_library_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法解析应用数据目录: {e}"))?;
    let dir = base.join("smart-doc-library");
    std::fs::create_dir_all(&dir).map_err(|e| format!("无法创建模板库目录: {e}"))?;
    Ok(dir)
}

#[tauri::command]
pub async fn smart_doc_learn_template(
    app: tauri::AppHandle,
    docx_path: String,
    name: Option<String>,
    description: Option<String>,
) -> Result<crate::tools::word_smart_doc_util::TemplateMeta, String> {
    let dir = smart_doc_library_dir(&app)?;
    crate::tools::word_smart_doc_util::learn_template(&dir, &docx_path, name, description)
}

#[tauri::command]
pub async fn smart_doc_list_templates(
    app: tauri::AppHandle,
) -> Result<Vec<crate::tools::word_smart_doc_util::TemplateMeta>, String> {
    let dir = smart_doc_library_dir(&app)?;
    crate::tools::word_smart_doc_util::list_templates(&dir)
}

#[tauri::command]
pub async fn smart_doc_rename_template(
    app: tauri::AppHandle,
    id: String,
    name: String,
) -> Result<(), String> {
    let dir = smart_doc_library_dir(&app)?;
    crate::tools::word_smart_doc_util::rename_template(&dir, &id, &name)
}

#[tauri::command]
pub async fn smart_doc_delete_template(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let dir = smart_doc_library_dir(&app)?;
    crate::tools::word_smart_doc_util::delete_template(&dir, &id)
}

#[tauri::command]
pub async fn smart_doc_get_profile(
    app: tauri::AppHandle,
    id: String,
) -> Result<serde_json::Value, String> {
    let dir = smart_doc_library_dir(&app)?;
    crate::tools::word_smart_doc_util::read_profile(&dir, &id)
}

#[tauri::command]
pub async fn smart_doc_update_profile(
    app: tauri::AppHandle,
    id: String,
    profile: serde_json::Value,
) -> Result<(), String> {
    let dir = smart_doc_library_dir(&app)?;
    crate::tools::word_smart_doc_util::update_profile(&dir, &id, profile)
}

#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub async fn smart_doc_generate(
    app: tauri::AppHandle,
    id: String,
    output_path: String,
    content_kind: String,
    content_path: Option<String>,
    content_text: Option<String>,
    sections: Option<serde_json::Value>,
    reporter: Option<String>,
    report_date: Option<String>,
) -> Result<crate::tools::word_smart_doc_util::FillResult, String> {
    let dir = smart_doc_library_dir(&app)?;
    crate::tools::word_smart_doc_util::generate(
        &dir, &id, &output_path, &content_kind, content_path, content_text, sections, reporter,
        report_date,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn list_files_in_dir_filters_extensions() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("a.pdf"), b"x").unwrap();
        fs::write(dir.path().join("b.txt"), b"x").unwrap();
        fs::write(dir.path().join("c.png"), b"x").unwrap();

        let files = list_files_in_dir(
            dir.path().to_string_lossy().into_owned(),
            vec!["pdf".into(), "png".into()],
        )
        .unwrap();

        assert_eq!(files.len(), 2);
        assert!(files.iter().any(|p| p.ends_with("a.pdf")));
        assert!(files.iter().any(|p| p.ends_with("c.png")));
    }

    #[test]
    fn build_registry_ids_match_manifest() {
        let manifest: Vec<String> = serde_json::from_str(include_str!(
            "../../packages/shared-types/tool-ids.json"
        ))
        .expect("tool-ids.json 应为字符串数组");

        let reg = build_registry();
        let mut ids: Vec<String> = reg.list().into_iter().map(|s| s.id).collect();
        ids.sort();

        let mut expected = manifest;
        expected.sort();

        assert_eq!(ids, expected);
        assert_eq!(ids.len(), 26);
    }
}

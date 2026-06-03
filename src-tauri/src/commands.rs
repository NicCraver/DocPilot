use crate::tools::{
    compress_pdf::CompressPdf,
    extra::{
        AddBlankPages, ComputeHash, CompressImage, ConvertImage, CopyFile, CropImage, DeletePages,
        DuplicatePage, ExtractPages, GetFileInfo, GetImageInfo, GetPdfInfo, ImagesToPdf,
        MergeImages, MoveFile, ReorderPages, ResizeImage, RotateImage, RotatePdf, TextToPdf,
    },
    merge_pdf::MergePdf,
    split_pdf::SplitPdf,
    ToolInput, ToolOutput, ToolRegistry, ToolSchema,
};
use tauri::State;

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
        assert_eq!(ids.len(), 23);
    }
}

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_registry_contains_all_tools() {
        let reg = build_registry();
        let ids: Vec<String> = reg.list().into_iter().map(|s| s.id).collect();
        assert_eq!(ids.len(), 23);
        assert!(ids.contains(&"compress_pdf".to_string()));
        assert!(ids.contains(&"get_pdf_info".to_string()));
        assert!(ids.contains(&"compress_image".to_string()));
        assert!(ids.contains(&"text_to_pdf".to_string()));
        assert!(ids.contains(&"move_file".to_string()));
    }
}

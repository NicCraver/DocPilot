//! 阶段三扩展工具：PDF / 图片 / 文件 / 文本

mod file_tools;
mod image_tools;
mod markitdown_tools;
mod pdf_tools;
mod text_tools;
mod word_typeset_tools;

pub use file_tools::{ComputeHash, CopyFile, GetFileInfo, MoveFile};
pub use image_tools::{
    CompressImage, ConvertImage, CropImage, GetImageInfo, ImagesToPdf, MergeImages, ResizeImage,
    RotateImage,
};
pub use pdf_tools::{
    AddBlankPages, DeletePages, DuplicatePage, ExtractPages, GetPdfInfo, ReorderPages, RotatePdf,
};
pub use markitdown_tools::ConvertToMarkdown;
pub use text_tools::TextToPdf;
pub use word_typeset_tools::{FormatDocxBatch, FormatDocxText};

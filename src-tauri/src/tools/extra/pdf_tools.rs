use crate::tools::pdf_lopdf_util::{
    add_blank_pages, delete_pages, duplicate_page, extract_pages_by_numbers, get_pdf_info,
    reorder_pages, rotate_pages,
};
use crate::tools::{Tool, ToolError, ToolInput, ToolOutput, ToolSchema};
use async_trait::async_trait;
use serde::Deserialize;

macro_rules! pdf_tool {
    ($struct:ident, $id:expr, $desc:expr, $schema:expr, $exec:expr) => {
        pub struct $struct;

        #[async_trait]
        impl Tool for $struct {
            fn id(&self) -> &str {
                $id
            }
            fn schema(&self) -> ToolSchema {
                ToolSchema {
                    id: $id.into(),
                    description: $desc.into(),
                    parameters: $schema,
                    requires_confirmation: false,
                }
            }
            async fn execute(&self, input: ToolInput) -> Result<ToolOutput, ToolError> {
                $exec(input)
            }
        }
    };
}

pdf_tool!(GetPdfInfo, "get_pdf_info", "读取 PDF 元信息（页数、大小、版本）", serde_json::json!({
        "type": "object",
        "properties": { "input_path": { "type": "string", "description": "PDF 路径" } },
        "required": ["input_path"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_path: String }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let info = get_pdf_info(&args.input_path).map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({
                "page_count": info.page_count,
                "file_size": info.file_size,
                "version": info.version,
            }),
            message: format!("共 {} 页，{} 字节", info.page_count, info.file_size),
        })
    });

pdf_tool!(RotatePdf, "rotate_pdf", "旋转 PDF 页面（90/180/270 度）", serde_json::json!({
        "type": "object",
        "properties": {
            "input_path": { "type": "string" },
            "output_path": { "type": "string" },
            "degrees": { "type": "integer", "description": "90 / 180 / 270" },
            "page_numbers": { "type": "array", "items": { "type": "integer" }, "description": "留空则旋转全部页" }
        },
        "required": ["input_path", "output_path", "degrees"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_path: String, output_path: String, degrees: i32, page_numbers: Option<Vec<u32>> }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let n = rotate_pages(&args.input_path, &args.output_path, args.page_numbers, args.degrees)
            .map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "output_path": args.output_path, "rotated_pages": n }),
            message: format!("已旋转 {n} 页"),
        })
    });

pdf_tool!(ExtractPages, "extract_pages", "按页码列表提取 PDF 页面", serde_json::json!({
        "type": "object",
        "properties": {
            "input_path": { "type": "string" },
            "output_path": { "type": "string" },
            "page_numbers": { "type": "array", "items": { "type": "integer" } }
        },
        "required": ["input_path", "output_path", "page_numbers"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_path: String, output_path: String, page_numbers: Vec<u32> }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let n = extract_pages_by_numbers(&args.input_path, &args.output_path, &args.page_numbers)
            .map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "output_path": args.output_path, "page_count": n }),
            message: format!("已提取 {n} 页"),
        })
    });

pdf_tool!(DeletePages, "delete_pages", "删除 PDF 指定页", serde_json::json!({
        "type": "object",
        "properties": {
            "input_path": { "type": "string" },
            "output_path": { "type": "string" },
            "pages_to_delete": { "type": "array", "items": { "type": "integer" } }
        },
        "required": ["input_path", "output_path", "pages_to_delete"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_path: String, output_path: String, pages_to_delete: Vec<u32> }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let n = delete_pages(&args.input_path, &args.output_path, &args.pages_to_delete)
            .map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "output_path": args.output_path, "page_count": n }),
            message: format!("删除后剩余 {n} 页"),
        })
    });

pdf_tool!(ReorderPages, "reorder_pages", "重排 PDF 页序", serde_json::json!({
        "type": "object",
        "properties": {
            "input_path": { "type": "string" },
            "output_path": { "type": "string" },
            "new_order": { "type": "array", "items": { "type": "integer" }, "description": "新的页码顺序（1-based 全排列）" }
        },
        "required": ["input_path", "output_path", "new_order"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_path: String, output_path: String, new_order: Vec<u32> }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let n = reorder_pages(&args.input_path, &args.output_path, &args.new_order)
            .map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "output_path": args.output_path, "page_count": n }),
            message: format!("已重排 {n} 页"),
        })
    });

pdf_tool!(AddBlankPages, "add_blank_pages", "在 PDF 指定位置插入空白页", serde_json::json!({
        "type": "object",
        "properties": {
            "input_path": { "type": "string" },
            "output_path": { "type": "string" },
            "count": { "type": "integer", "description": "空白页数量" },
            "after_page": { "type": "integer", "description": "插入位置（0=文档开头）" }
        },
        "required": ["input_path", "output_path", "count", "after_page"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_path: String, output_path: String, count: u32, after_page: u32 }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let n = add_blank_pages(&args.input_path, &args.output_path, args.count, args.after_page)
            .map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "output_path": args.output_path, "page_count": n }),
            message: format!("插入后共 {n} 页"),
        })
    });

pdf_tool!(DuplicatePage, "duplicate_page", "复制 PDF 指定页（额外副本数）", serde_json::json!({
        "type": "object",
        "properties": {
            "input_path": { "type": "string" },
            "output_path": { "type": "string" },
            "page_number": { "type": "integer" },
            "times": { "type": "integer", "description": "额外复制次数" }
        },
        "required": ["input_path", "output_path", "page_number", "times"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_path: String, output_path: String, page_number: u32, times: u32 }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let n = duplicate_page(&args.input_path, &args.output_path, args.page_number, args.times)
            .map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "output_path": args.output_path, "page_count": n }),
            message: format!("复制后共 {n} 页"),
        })
    });

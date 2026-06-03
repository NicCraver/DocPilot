use crate::tools::pdf_lopdf_util::split_pdf_file;
use crate::tools::{Tool, ToolError, ToolInput, ToolOutput, ToolSchema};
use async_trait::async_trait;
use serde::Deserialize;

pub struct SplitPdf;

#[derive(Deserialize)]
struct Args {
    input_path: String,
    output_path: String,
    start_page: u32,
    end_page: u32,
}

#[async_trait]
impl Tool for SplitPdf {
    fn id(&self) -> &str {
        "split_pdf"
    }

    fn schema(&self) -> ToolSchema {
        ToolSchema {
            id: "split_pdf".into(),
            description: "按页码范围拆分 PDF（页码从 1 开始，含首尾）。参数 input_path、output_path、start_page、end_page。"
                .into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "input_path": { "type": "string" },
                    "output_path": { "type": "string" },
                    "start_page": { "type": "integer", "description": "起始页（从 1 开始）" },
                    "end_page": { "type": "integer", "description": "结束页（含）" }
                },
                "required": ["input_path", "output_path", "start_page", "end_page"]
            }),
            requires_confirmation: false,
        }
    }

    async fn execute(&self, input: ToolInput) -> Result<ToolOutput, ToolError> {
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;

        let page_count = split_pdf_file(
            &args.input_path,
            &args.output_path,
            args.start_page,
            args.end_page,
        )
        .map_err(ToolError::Execution)?;

        Ok(ToolOutput {
            data: serde_json::json!({
                "output_path": args.output_path,
                "page_count": page_count,
                "start_page": args.start_page,
                "end_page": args.end_page,
            }),
            message: format!(
                "已拆分第 {}–{} 页，共 {} 页 → {}",
                args.start_page, args.end_page, page_count, args.output_path
            ),
        })
    }
}

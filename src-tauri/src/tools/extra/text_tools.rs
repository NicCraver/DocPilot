use crate::tools::image_util::text_to_pdf;
use crate::tools::{Tool, ToolError, ToolInput, ToolOutput, ToolSchema};
use async_trait::async_trait;
use serde::Deserialize;

pub struct TextToPdf;

#[async_trait]
impl Tool for TextToPdf {
    fn id(&self) -> &str {
        "text_to_pdf"
    }

    fn schema(&self) -> ToolSchema {
        ToolSchema {
            id: "text_to_pdf".into(),
            description: "将纯文本转换为 PDF".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "text": { "type": "string", "description": "文本内容" },
                    "output_path": { "type": "string" },
                    "font_size": { "type": "number", "description": "字号，默认 12" }
                },
                "required": ["text", "output_path"]
            }),
            requires_confirmation: false,
        }
    }

    async fn execute(&self, input: ToolInput) -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args {
            text: String,
            output_path: String,
            font_size: Option<f32>,
        }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let size = args.font_size.unwrap_or(12.0);
        let lines = text_to_pdf(&args.text, &args.output_path, size).map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({
                "output_path": args.output_path,
                "line_count": lines,
            }),
            message: format!("已生成 PDF（{lines} 行）"),
        })
    }
}

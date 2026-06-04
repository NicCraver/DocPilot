use crate::tools::markitdown_util::convert_to_markdown;
use crate::tools::{Tool, ToolError, ToolInput, ToolOutput, ToolSchema};
use async_trait::async_trait;
use serde::Deserialize;

pub struct ConvertToMarkdown;

#[async_trait]
impl Tool for ConvertToMarkdown {
    fn id(&self) -> &str {
        "convert_to_markdown"
    }

    fn schema(&self) -> ToolSchema {
        ToolSchema {
            id: "convert_to_markdown".into(),
            description: "使用 Microsoft MarkItDown 将 Office/PDF/图片/HTML 等文件转为 Markdown（需本机已安装 markitdown）".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "input_path": { "type": "string", "description": "源文件路径" },
                    "output_path": { "type": "string", "description": "输出 .md 路径，默认同目录同名" },
                    "use_plugins": { "type": "boolean", "description": "是否启用 markitdown 插件，默认 false" }
                },
                "required": ["input_path"]
            }),
            requires_confirmation: false,
        }
    }

    async fn execute(&self, input: ToolInput) -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args {
            input_path: String,
            output_path: Option<String>,
            use_plugins: Option<bool>,
        }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;

        let result = convert_to_markdown(
            &args.input_path,
            args.output_path.as_deref(),
            args.use_plugins.unwrap_or(false),
        )
        .map_err(ToolError::Execution)?;

        let preview: String = result.markdown.chars().take(2000).collect();
        let truncated = result.char_count > preview.chars().count();

        let via = if result.used_ocr {
            "已通过 OCR"
        } else {
            "已转为 Markdown"
        };
        Ok(ToolOutput {
            data: serde_json::json!({
                "input_path": args.input_path,
                "output_path": result.output_path,
                "char_count": result.char_count,
                "used_ocr": result.used_ocr,
                "markdown_preview": preview,
                "preview_truncated": truncated,
            }),
            message: format!(
                "{via}（{} 字符）→ {}",
                result.char_count, result.output_path
            ),
        })
    }
}

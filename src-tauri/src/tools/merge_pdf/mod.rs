use crate::tools::pdf_lopdf_util::merge_pdf_files;
use crate::tools::{Tool, ToolError, ToolInput, ToolOutput, ToolSchema};
use async_trait::async_trait;
use serde::Deserialize;

pub struct MergePdf;

#[derive(Deserialize)]
struct Args {
    input_paths: Vec<String>,
    output_path: String,
}

#[async_trait]
impl Tool for MergePdf {
    fn id(&self) -> &str {
        "merge_pdf"
    }

    fn schema(&self) -> ToolSchema {
        ToolSchema {
            id: "merge_pdf".into(),
            description: "合并多个 PDF 为一个文件。参数 input_paths（路径数组）与 output_path。".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "input_paths": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "待合并的 PDF 路径列表（至少 2 个）"
                    },
                    "output_path": { "type": "string", "description": "输出 PDF 路径" }
                },
                "required": ["input_paths", "output_path"]
            }),
            requires_confirmation: false,
        }
    }

    async fn execute(&self, input: ToolInput) -> Result<ToolOutput, ToolError> {
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;

        let page_count = merge_pdf_files(&args.input_paths, &args.output_path)
            .map_err(ToolError::Execution)?;

        Ok(ToolOutput {
            data: serde_json::json!({
                "output_path": args.output_path,
                "page_count": page_count,
                "file_count": args.input_paths.len(),
            }),
            message: format!(
                "已合并 {} 个文件，共 {} 页 → {}",
                args.input_paths.len(),
                page_count,
                args.output_path
            ),
        })
    }
}

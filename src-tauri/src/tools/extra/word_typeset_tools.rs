use crate::tools::word_typeset_util::{run_word_typeset, TypesetBatchResult};
use crate::tools::{Tool, ToolError, ToolInput, ToolOutput, ToolSchema};
use async_trait::async_trait;
use serde::Deserialize;

pub struct FormatDocxBatch;

#[async_trait]
impl Tool for FormatDocxBatch {
    fn id(&self) -> &str {
        "format_docx_batch"
    }

    fn schema(&self) -> ToolSchema {
        ToolSchema {
            id: "format_docx_batch".into(),
            description: "按配置批量排版 Word (.docx) 文档（页边距、标题、正文、表格等）".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "input_paths": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "待排版 .docx 路径列表"
                    },
                    "config": {
                        "type": "object",
                        "description": "排版配置 JSON（省略字段使用内置默认）"
                    },
                    "in_place": {
                        "type": "boolean",
                        "description": "是否原地覆盖（默认 true，会先备份 .docx.bak）"
                    }
                },
                "required": ["input_paths"]
            }),
            requires_confirmation: true,
        }
    }

    async fn execute(&self, input: ToolInput) -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args {
            input_paths: Vec<String>,
            config: Option<serde_json::Value>,
            in_place: Option<bool>,
        }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;

        if args.input_paths.is_empty() {
            return Err(ToolError::InvalidInput("input_paths 不能为空".into()));
        }

        let payload = serde_json::json!({
            "mode": "batch",
            "input_paths": args.input_paths,
            "config": args.config,
            "in_place": args.in_place.unwrap_or(true),
        });

        let result = run_word_typeset(payload).map_err(ToolError::Execution)?;
        build_output(result)
    }
}

pub struct FormatDocxText;

#[async_trait]
impl Tool for FormatDocxText {
    fn id(&self) -> &str {
        "format_docx_text"
    }

    fn schema(&self) -> ToolSchema {
        ToolSchema {
            id: "format_docx_text".into(),
            description: "将纯文本生成 Word 并按配置排版".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "text": { "type": "string", "description": "待排版文本" },
                    "output_path": { "type": "string", "description": "输出 .docx 路径" },
                    "config": { "type": "object", "description": "排版配置 JSON" }
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
            config: Option<serde_json::Value>,
        }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;

        let payload = serde_json::json!({
            "mode": "text",
            "text": args.text,
            "output_path": args.output_path,
            "config": args.config,
        });

        let result = run_word_typeset(payload).map_err(ToolError::Execution)?;
        build_output(result)
    }
}

fn build_output(result: TypesetBatchResult) -> Result<ToolOutput, ToolError> {
    let count = result.results.len();
    let message = if count == 1 {
        format!("排版完成 → {}", result.results[0].output)
    } else {
        format!("已排版 {count} 个文档")
    };

    Ok(ToolOutput {
        data: serde_json::json!({
            "results": result.results,
            "logs": result.logs,
        }),
        message,
    })
}

use crate::tools::file_util::{compute_hash, copy_file, get_file_info, move_file};
use crate::tools::{Tool, ToolError, ToolInput, ToolOutput, ToolSchema};
use async_trait::async_trait;
use serde::Deserialize;

macro_rules! file_tool {
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

file_tool!(GetFileInfo, "get_file_info", "读取文件元信息", serde_json::json!({
        "type": "object",
        "properties": { "path": { "type": "string" } },
        "required": ["path"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { path: String }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let info = get_file_info(&args.path).map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({
                "path": info.path, "file_name": info.file_name,
                "size": info.size, "is_dir": info.is_dir, "extension": info.extension,
            }),
            message: format!("{} ({} 字节)", info.file_name, info.size),
        })
    });

file_tool!(ComputeHash, "compute_hash", "计算文件哈希（md5 / sha256）", serde_json::json!({
        "type": "object",
        "properties": {
            "path": { "type": "string" },
            "algorithm": { "type": "string", "description": "md5 或 sha256" }
        },
        "required": ["path", "algorithm"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { path: String, algorithm: String }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let hash = compute_hash(&args.path, &args.algorithm).map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "hash": hash, "algorithm": args.algorithm }),
            message: format!("{}: {hash}", args.algorithm.to_uppercase()),
        })
    });

file_tool!(CopyFile, "copy_file", "复制文件", serde_json::json!({
        "type": "object",
        "properties": {
            "src": { "type": "string" },
            "dest": { "type": "string" }
        },
        "required": ["src", "dest"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { src: String, dest: String }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let bytes = copy_file(&args.src, &args.dest).map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "dest": args.dest, "bytes": bytes }),
            message: format!("已复制 {bytes} 字节 → {}", args.dest),
        })
    });

file_tool!(MoveFile, "move_file", "移动或重命名文件", serde_json::json!({
        "type": "object",
        "properties": {
            "src": { "type": "string" },
            "dest": { "type": "string" }
        },
        "required": ["src", "dest"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { src: String, dest: String }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        move_file(&args.src, &args.dest).map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "dest": args.dest }),
            message: format!("已移动 → {}", args.dest),
        })
    });

use crate::tools::image_util::{
    compress_image, convert_image, crop_image, get_image_info, images_to_pdf, merge_images,
    resize_image, rotate_image,
};
use crate::tools::{Tool, ToolError, ToolInput, ToolOutput, ToolSchema};
use async_trait::async_trait;
use serde::Deserialize;

macro_rules! image_tool {
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

image_tool!(GetImageInfo, "get_image_info", "读取图片元信息", serde_json::json!({
        "type": "object",
        "properties": { "input_path": { "type": "string" } },
        "required": ["input_path"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_path: String }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let info = get_image_info(&args.input_path).map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({
                "width": info.width, "height": info.height,
                "format": info.format, "size": info.size,
            }),
            message: format!("{}x{} {} ({} 字节)", info.width, info.height, info.format, info.size),
        })
    });

image_tool!(CompressImage, "compress_image", "压缩图片（JPEG 质量）", serde_json::json!({
        "type": "object",
        "properties": {
            "input_path": { "type": "string" },
            "output_path": { "type": "string" },
            "quality": { "type": "integer", "description": "1-100，默认 85" }
        },
        "required": ["input_path", "output_path"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_path: String, output_path: String, quality: Option<u8> }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let q = args.quality.unwrap_or(85);
        let (before, after) = compress_image(&args.input_path, &args.output_path, q)
            .map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "output_path": args.output_path, "before_size": before, "after_size": after }),
            message: format!("已压缩：{before} → {after} 字节"),
        })
    });

image_tool!(ResizeImage, "resize_image", "缩放图片", serde_json::json!({
        "type": "object",
        "properties": {
            "input_path": { "type": "string" },
            "output_path": { "type": "string" },
            "width": { "type": "integer" },
            "height": { "type": "integer" },
            "keep_aspect": { "type": "boolean", "description": "默认 true" }
        },
        "required": ["input_path", "output_path", "width", "height"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_path: String, output_path: String, width: u32, height: u32, keep_aspect: Option<bool> }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let (w, h) = resize_image(&args.input_path, &args.output_path, args.width, args.height, args.keep_aspect.unwrap_or(true))
            .map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "output_path": args.output_path, "width": w, "height": h }),
            message: format!("已缩放至 {w}x{h}"),
        })
    });

image_tool!(ConvertImage, "convert_image", "转换图片格式", serde_json::json!({
        "type": "object",
        "properties": {
            "input_path": { "type": "string" },
            "output_path": { "type": "string", "description": "扩展名决定目标格式" }
        },
        "required": ["input_path", "output_path"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_path: String, output_path: String }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let fmt = convert_image(&args.input_path, &args.output_path).map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "output_path": args.output_path, "format": fmt }),
            message: format!("已转换为 {fmt}"),
        })
    });

image_tool!(CropImage, "crop_image", "裁剪图片", serde_json::json!({
        "type": "object",
        "properties": {
            "input_path": { "type": "string" },
            "output_path": { "type": "string" },
            "x": { "type": "integer" }, "y": { "type": "integer" },
            "width": { "type": "integer" }, "height": { "type": "integer" }
        },
        "required": ["input_path", "output_path", "x", "y", "width", "height"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_path: String, output_path: String, x: u32, y: u32, width: u32, height: u32 }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let (w, h) = crop_image(&args.input_path, &args.output_path, args.x, args.y, args.width, args.height)
            .map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "output_path": args.output_path, "width": w, "height": h }),
            message: format!("已裁剪为 {w}x{h}"),
        })
    });

image_tool!(RotateImage, "rotate_image", "旋转图片（90/180/270）", serde_json::json!({
        "type": "object",
        "properties": {
            "input_path": { "type": "string" },
            "output_path": { "type": "string" },
            "degrees": { "type": "integer" }
        },
        "required": ["input_path", "output_path", "degrees"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_path: String, output_path: String, degrees: i32 }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let (w, h) = rotate_image(&args.input_path, &args.output_path, args.degrees)
            .map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "output_path": args.output_path, "width": w, "height": h }),
            message: format!("已旋转，尺寸 {w}x{h}"),
        })
    });

image_tool!(MergeImages, "merge_images", "拼接多张图片", serde_json::json!({
        "type": "object",
        "properties": {
            "input_paths": { "type": "array", "items": { "type": "string" } },
            "output_path": { "type": "string" },
            "horizontal": { "type": "boolean", "description": "true=横向，false=纵向" }
        },
        "required": ["input_paths", "output_path"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_paths: Vec<String>, output_path: String, horizontal: Option<bool> }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let (w, h, n) = merge_images(&args.input_paths, &args.output_path, args.horizontal.unwrap_or(true))
            .map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "output_path": args.output_path, "width": w, "height": h, "image_count": n }),
            message: format!("已拼接 {n} 张图片 ({w}x{h})"),
        })
    });

image_tool!(ImagesToPdf, "images_to_pdf", "多张图片合并为 PDF", serde_json::json!({
        "type": "object",
        "properties": {
            "input_paths": { "type": "array", "items": { "type": "string" } },
            "output_path": { "type": "string" }
        },
        "required": ["input_paths", "output_path"]
    }), |input: ToolInput| -> Result<ToolOutput, ToolError> {
        #[derive(Deserialize)]
        struct Args { input_paths: Vec<String>, output_path: String }
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;
        let n = images_to_pdf(&args.input_paths, &args.output_path).map_err(ToolError::Execution)?;
        Ok(ToolOutput {
            data: serde_json::json!({ "output_path": args.output_path, "page_count": n }),
            message: format!("已生成 {n} 页 PDF"),
        })
    });

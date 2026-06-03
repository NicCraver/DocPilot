use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::{ColorType, DynamicImage, ImageFormat, RgbaImage};
use std::fs::File;
use std::io::BufWriter;
use std::path::Path;

#[derive(Debug, Clone, serde::Serialize)]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub size: u64,
}

fn guess_format(path: &str) -> Result<ImageFormat, String> {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => Ok(ImageFormat::Jpeg),
        "png" => Ok(ImageFormat::Png),
        "webp" => Ok(ImageFormat::WebP),
        "gif" => Ok(ImageFormat::Gif),
        other => Err(format!("不支持的图片格式: {other}")),
    }
}

fn format_to_ext(fmt: ImageFormat) -> &'static str {
    match fmt {
        ImageFormat::Jpeg => "jpg",
        ImageFormat::Png => "png",
        ImageFormat::WebP => "webp",
        ImageFormat::Gif => "gif",
        _ => "png",
    }
}

pub fn load_image(path: &str) -> Result<DynamicImage, String> {
    if !Path::new(path).exists() {
        return Err(format!("文件不存在: {path}"));
    }
    image::open(path).map_err(|e| format!("加载图片失败: {e}"))
}

pub fn get_image_info(path: &str) -> Result<ImageInfo, String> {
    let img = load_image(path)?;
    let fmt = guess_format(path).unwrap_or(ImageFormat::Png);
    let size = std::fs::metadata(path)
        .map_err(|e| format!("读取文件大小失败: {e}"))?
        .len();
    Ok(ImageInfo {
        width: img.width(),
        height: img.height(),
        format: format_to_ext(fmt).to_string(),
        size,
    })
}

pub fn compress_image(path: &str, output: &str, quality: u8) -> Result<(u64, u64), String> {
    let before = std::fs::metadata(path)
        .map_err(|e| format!("读取源文件失败: {e}"))?
        .len();
    let img = load_image(path)?;
    let fmt = guess_format(output).or_else(|_| guess_format(path))?;
    save_image(&img, output, fmt, quality)?;
    let after = std::fs::metadata(output)
        .map_err(|e| format!("读取输出文件失败: {e}"))?
        .len();
    Ok((before, after))
}

pub fn resize_image(
    path: &str,
    output: &str,
    width: u32,
    height: u32,
    keep_aspect: bool,
) -> Result<(u32, u32), String> {
    let img = load_image(path)?;
    let resized = if keep_aspect {
        img.resize(width, height, FilterType::Lanczos3)
    } else {
        img.resize_exact(width, height, FilterType::Lanczos3)
    };
    let fmt = guess_format(output).or_else(|_| guess_format(path))?;
    save_image(&resized, output, fmt, 85)?;
    Ok((resized.width(), resized.height()))
}

pub fn convert_image(path: &str, output: &str) -> Result<String, String> {
    let img = load_image(path)?;
    let fmt = guess_format(output)?;
    save_image(&img, output, fmt, 85)?;
    Ok(format_to_ext(fmt).to_string())
}

pub fn crop_image(path: &str, output: &str, x: u32, y: u32, w: u32, h: u32) -> Result<(u32, u32), String> {
    let img = load_image(path)?;
    if x + w > img.width() || y + h > img.height() {
        return Err("裁剪区域超出图片范围".into());
    }
    let cropped = img.crop_imm(x, y, w, h);
    let fmt = guess_format(output).or_else(|_| guess_format(path))?;
    save_image(&cropped, output, fmt, 85)?;
    Ok((w, h))
}

pub fn rotate_image(path: &str, output: &str, degrees: i32) -> Result<(u32, u32), String> {
    let img = load_image(path)?;
    let rotated = match degrees {
        90 => img.rotate90(),
        180 => img.rotate180(),
        270 => img.rotate270(),
        other => return Err(format!("不支持的旋转角度: {other}（可用 90/180/270）")),
    };
    let fmt = guess_format(output).or_else(|_| guess_format(path))?;
    save_image(&rotated, output, fmt, 85)?;
    Ok((rotated.width(), rotated.height()))
}

pub fn merge_images(paths: &[String], output: &str, horizontal: bool) -> Result<(u32, u32, usize), String> {
    if paths.len() < 2 {
        return Err("至少需要 2 张图片".into());
    }
    let mut images = Vec::new();
    for p in paths {
        images.push(load_image(p)?);
    }
    let (w, h) = if horizontal {
        let h = images.iter().map(|i| i.height()).max().unwrap_or(0);
        let w: u32 = images.iter().map(|i| i.width()).sum();
        (w, h)
    } else {
        let w = images.iter().map(|i| i.width()).max().unwrap_or(0);
        let h: u32 = images.iter().map(|i| i.height()).sum();
        (w, h)
    };
    let mut canvas = RgbaImage::new(w, h);
    let mut offset_x = 0u32;
    let mut offset_y = 0u32;
    for img in &images {
        let rgba = img.to_rgba8();
        image::imageops::overlay(&mut canvas, &rgba, offset_x as i64, offset_y as i64);
        if horizontal {
            offset_x += img.width();
        } else {
            offset_y += img.height();
        }
    }
    let fmt = guess_format(output)?;
    save_image(&DynamicImage::ImageRgba8(canvas), output, fmt, 85)?;
    Ok((w, h, paths.len()))
}

fn save_image(img: &DynamicImage, output: &str, fmt: ImageFormat, quality: u8) -> Result<(), String> {
    if fmt == ImageFormat::Jpeg {
        let rgb = img.to_rgb8();
        let file = File::create(output).map_err(|e| format!("创建输出文件失败: {e}"))?;
        let mut encoder = JpegEncoder::new_with_quality(BufWriter::new(file), quality);
        encoder
            .encode(&rgb, rgb.width(), rgb.height(), ColorType::Rgb8)
            .map_err(|e| format!("保存 JPEG 失败: {e}"))?;
        return Ok(());
    }
    img.save_with_format(output, fmt)
        .map_err(|e| format!("保存图片失败: {e}"))
}

pub fn images_to_pdf(paths: &[String], output: &str) -> Result<u32, String> {
    use printpdf::*;
    use std::io::BufWriter;

    if paths.is_empty() {
        return Err("至少需要 1 张图片".into());
    }

    let (doc, page1, layer1) =
        PdfDocument::new("DocPilot Images", Mm(210.0), Mm(297.0), "Layer 1");
    let mut page_count = 0u32;
    let mm_per_px = 25.4 / 72.0;

    for (idx, path) in paths.iter().enumerate() {
        let img = load_image(path)?;
        let (page_ref, layer_ref) = if idx == 0 {
            (page1, layer1)
        } else {
            doc.add_page(Mm(210.0), Mm(297.0), "Layer 1")
        };

        let (iw, ih) = (img.width(), img.height());
        let page_w = 210.0f32;
        let page_h = 297.0f32;
        let scale = (page_w / iw as f32).min(page_h / ih as f32);
        let draw_w = iw as f32 * scale;
        let draw_h = ih as f32 * scale;
        let x = (page_w - draw_w) / 2.0;
        let y = (page_h - draw_h) / 2.0;

        let pdf_image = Image::from_dynamic_image(&img);
        let layer = doc.get_page(page_ref).get_layer(layer_ref);
        pdf_image.add_to_layer(
            layer,
            ImageTransform {
                translate_x: Some(Mm(x)),
                translate_y: Some(Mm(y)),
                dpi: Some(72.0),
                scale_x: Some(draw_w / (iw as f32 * mm_per_px)),
                scale_y: Some(draw_h / (ih as f32 * mm_per_px)),
                ..Default::default()
            },
        );
        page_count += 1;
    }

    let file = File::create(output).map_err(|e| format!("创建 PDF 失败: {e}"))?;
    doc.save(&mut BufWriter::new(file))
        .map_err(|e| format!("保存 PDF 失败: {e}"))?;
    Ok(page_count)
}

pub fn text_to_pdf(text: &str, output: &str, font_size: f32) -> Result<u32, String> {
    use printpdf::*;
    use std::io::BufWriter;

    let (doc, page1, layer1) =
        PdfDocument::new("DocPilot Text", Mm(210.0), Mm(297.0), "Layer 1");
    let font = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| format!("加载字体失败: {e}"))?;
    let layer = doc.get_page(page1).get_layer(layer1);

    let lines: Vec<&str> = text.lines().collect();
    let line_height = font_size * 0.5 + 2.0;
    let mut y = 280.0f32;
    for line in &lines {
        if y < 20.0 {
            break;
        }
        layer.use_text(*line, font_size, Mm(20.0), Mm(y), &font);
        y -= line_height;
    }

    let file = File::create(output).map_err(|e| format!("创建 PDF 失败: {e}"))?;
    doc.save(&mut BufWriter::new(file))
        .map_err(|e| format!("保存 PDF 失败: {e}"))?;
    Ok(lines.len() as u32)
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::Rgba;

    fn write_png(path: &std::path::Path, w: u32, h: u32) {
        let img = RgbaImage::from_pixel(w, h, Rgba([100, 150, 200, 255]));
        img.save(path).unwrap();
    }

    #[test]
    fn image_ops() {
        let dir = tempfile::tempdir().unwrap();
        let src = dir.path().join("a.png");
        let out = dir.path().join("b.jpg");
        write_png(&src, 100, 80);
        let info = get_image_info(src.to_str().unwrap()).unwrap();
        assert_eq!(info.width, 100);
        compress_image(src.to_str().unwrap(), out.to_str().unwrap(), 80).unwrap();
        assert!(out.exists());
    }
}

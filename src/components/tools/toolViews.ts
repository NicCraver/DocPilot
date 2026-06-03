import { defineAsyncComponent, type Component } from "vue";
import type { ToolId } from "@docpilot/shared-types";

export const toolViews = {
  compress_pdf: defineAsyncComponent(() => import("./compress-pdf/CompressPdf.vue")),
  merge_pdf: defineAsyncComponent(() => import("./merge-pdf/MergePdf.vue")),
  split_pdf: defineAsyncComponent(() => import("./split-pdf/SplitPdf.vue")),
  get_pdf_info: defineAsyncComponent(() => import("./get-pdf-info/GetPdfInfo.vue")),
  rotate_pdf: defineAsyncComponent(() => import("./rotate-pdf/RotatePdf.vue")),
  extract_pages: defineAsyncComponent(() => import("./extract-pages/ExtractPages.vue")),
  delete_pages: defineAsyncComponent(() => import("./delete-pages/DeletePages.vue")),
  reorder_pages: defineAsyncComponent(() => import("./reorder-pages/ReorderPages.vue")),
  add_blank_pages: defineAsyncComponent(() => import("./add-blank-pages/AddBlankPages.vue")),
  duplicate_page: defineAsyncComponent(() => import("./duplicate-page/DuplicatePage.vue")),
  get_image_info: defineAsyncComponent(() => import("./get-image-info/GetImageInfo.vue")),
  compress_image: defineAsyncComponent(() => import("./compress-image/CompressImage.vue")),
  resize_image: defineAsyncComponent(() => import("./resize-image/ResizeImage.vue")),
  convert_image: defineAsyncComponent(() => import("./convert-image/ConvertImage.vue")),
  crop_image: defineAsyncComponent(() => import("./crop-image/CropImage.vue")),
  rotate_image: defineAsyncComponent(() => import("./rotate-image/RotateImage.vue")),
  merge_images: defineAsyncComponent(() => import("./merge-images/MergeImages.vue")),
  images_to_pdf: defineAsyncComponent(() => import("./images-to-pdf/ImagesToPdf.vue")),
  get_file_info: defineAsyncComponent(() => import("./get-file-info/GetFileInfo.vue")),
  compute_hash: defineAsyncComponent(() => import("./compute-hash/ComputeHash.vue")),
  copy_file: defineAsyncComponent(() => import("./copy-file/CopyFile.vue")),
  move_file: defineAsyncComponent(() => import("./move-file/MoveFile.vue")),
  text_to_pdf: defineAsyncComponent(() => import("./text-to-pdf/TextToPdf.vue")),
} satisfies Record<ToolId, Component>;

document.addEventListener("DOMContentLoaded", function () {
  const svgInput = document.getElementById("svgInput");
  const preview = document.getElementById("preview");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtnPreview = document.getElementById("copyBtnPreview");

  let originalCanvas;

  // 创建toast元素
  const toast = document.createElement('div');
  toast.style.cssText = `
      position: fixed;
      bottom: 36%;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      display: none;  // 确保默认是隐藏的
      z-index: 1000;
      display: none;
      justify-content: center;
      align-items: center;
      text-align: center;
  `;
  document.body.appendChild(toast);
  toast.style.display = 'none';  // 进一步确保初始化为 none

  function showToast(message, duration = 3000) {
    console.log(message);  // 检查是否有无意触发
    toast.textContent = message;
    toast.style.display = 'flex';  // 显示时设置为 flex 布局
    setTimeout(() => {
      toast.style.display = 'none';  // 隐藏时设置为 none
    }, duration);
  }


  // 添加拖拽相关的事件监听器
  svgInput.addEventListener("dragover", handleDragOver);
  svgInput.addEventListener("drop", handleDrop);

  function handleDragOver(event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event) {
    event.stopPropagation();
    event.preventDefault();

    const files = event.dataTransfer.files;

    if (files.length > 0) {
      const file = files[0];
      if (file.type === "image/svg+xml") {
        const reader = new FileReader();
        reader.onload = function (e) {
          const content = e.target.result;
          svgInput.value = content;
          convertSVGtoPNG();
          showToast("Success!");
        };
        reader.readAsText(file);
      } else {
        showToast("Please drop a valid SVG file");
      }
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Side panel received message:", message);
    if (message.type === "fill-svg-input" && message.svg) {
      console.log("Received SVG from background:", message.svg);
      streamInput(message.svg);
      sendResponse({ status: "success" });
    } else {
      console.log(
        "Received message is not of type 'fill-svg-input' or doesn't contain SVG"
      );
      sendResponse({ status: "error", message: "Invalid message format" });
    }
    return true;
  });

  svgInput.addEventListener("input", debounce(convertSVGtoPNG, 300));

  downloadBtn.addEventListener("click", downloadPNG);
  copyBtnPreview.addEventListener("click", copyToClipboard);

  function streamInput(text, speed = 1) {
    let i = 0;
    svgInput.value = "";
    function typeChar() {
      if (i < text.length) {
        svgInput.value += text.charAt(i);
        svgInput.scrollTop = svgInput.scrollHeight;
        i++;
        if (i % 10 === 0) {
          // 每10个字符更新一次，以提高性能
          setTimeout(typeChar, 0);
        } else {
          typeChar();
        }
      } else {
        convertSVGtoPNG();
      }
    }
    typeChar();
  }

  function convertSVGtoPNG() {
    console.log("Converting SVG to PNG");
    let svg = svgInput.value.trim();
    preview.innerHTML = "";
    copyBtnPreview.style.display = "none";

    if (!svg) {
      preview.innerHTML = "<p>PNG preview will appear here</p>";
      return;
    }

    if (!svg.includes('width="') && !svg.includes('height="')) {
      svg = svg.replace("<svg", '<svg width="800" height="600"');
    }

    const img = new Image();
    img.onload = function () {
      originalCanvas = document.createElement("canvas");
      originalCanvas.width = img.width;
      originalCanvas.height = img.height;
      const originalCtx = originalCanvas.getContext("2d");
      originalCtx.drawImage(img, 0, 0);

      const previewCanvas = document.createElement("canvas");
      const maxWidth = preview.clientWidth;
      const maxHeight = preview.clientHeight;
      let scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

      previewCanvas.width = img.width * scale;
      previewCanvas.height = img.height * scale;

      const previewCtx = previewCanvas.getContext("2d");
      previewCtx.scale(scale, scale);
      previewCtx.drawImage(img, 0, 0);

      preview.appendChild(previewCanvas);
      copyBtnPreview.style.display = "block";
    };
    img.onerror = function () {
      preview.innerHTML = "<p>Invalid SVG code</p>";
    };
    try {
      img.src =
        "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    } catch (e) {
      preview.innerHTML = "<p>Error converting SVG</p>";
    }
  }

  function downloadPNG() {
    if (originalCanvas) {
      originalCanvas.toBlob(function (blob) {
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          url: url,
          filename: "converted_image.png",
        });
      });
    } else {
      showToast("Please enter valid SVG code before downloading");
    }
  }

  function copyToClipboard() {
    if (originalCanvas) {
      originalCanvas.toBlob(function (blob) {
        navigator.clipboard
          .write([new ClipboardItem({ "image/png": blob })])
          .then(function () {
            showToast("Image copied!");
          })
          .catch(function (error) {
            console.error("Error copying image to clipboard:", error);
            showToast("Failed to copy image to clipboard");
          });
      });
    } else {
      showToast("Please enter valid SVG code before copying");
    }
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
});

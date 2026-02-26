// Dott Figma Plugin - Auto Push Receiver
// This runs in Figma's sandbox environment

figma.showUI(__html__, { width: 360, height: 480 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'place-image') {
    try {
      // msg.imageData is a Uint8Array of the PNG
      const imageHash = figma.createImage(msg.imageData).hash;
      
      // Parse size
      const [w, h] = (msg.size || '1080x1080').split('x').map(Number);
      
      // Create a rectangle with the image as fill
      const rect = figma.createRectangle();
      rect.name = msg.name || 'Dott Design';
      rect.resize(w, h);
      
      // Position at center of viewport
      const viewport = figma.viewport.center;
      rect.x = viewport.x - w / 2;
      rect.y = viewport.y - h / 2;
      
      // Set image fill
      rect.fills = [{
        type: 'IMAGE',
        scaleMode: 'FILL',
        imageHash,
      }];
      
      // Select and zoom to the new node
      figma.currentPage.selection = [rect];
      figma.viewport.scrollAndZoomIntoView([rect]);
      
      figma.ui.postMessage({
        type: 'place-success',
        pushId: msg.pushId,
        nodeId: rect.id,
      });
      
      figma.notify('✅ Dott 디자인이 추가되었습니다!');
    } catch (err) {
      figma.ui.postMessage({
        type: 'place-error',
        pushId: msg.pushId,
        error: String(err),
      });
      figma.notify('❌ 이미지 배치 실패: ' + String(err), { error: true });
    }
  }
};

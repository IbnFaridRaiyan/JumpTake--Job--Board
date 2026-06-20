const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const OUTPUT_SIZE = 512;

export const createSquareProfileImage = (file) => new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
        reject(new Error('Please select a JPG, PNG, WEBP, or GIF image.'));
        return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
        reject(new Error('Please choose an image smaller than 5 MB.'));
        return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The selected image could not be read.'));
    reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('The selected image format could not be opened.'));
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = OUTPUT_SIZE;
            canvas.height = OUTPUT_SIZE;

            const context = canvas.getContext('2d');
            const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
            const sourceX = (image.naturalWidth - sourceSize) / 2;
            const sourceY = (image.naturalHeight - sourceSize) / 2;

            context.drawImage(
                image,
                sourceX,
                sourceY,
                sourceSize,
                sourceSize,
                0,
                0,
                OUTPUT_SIZE,
                OUTPUT_SIZE
            );

            resolve(canvas.toDataURL('image/jpeg', 0.86));
        };
        image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
});

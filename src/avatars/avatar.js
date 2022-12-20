import JimpPkg from 'jimp/es/index.js';
const Jimp = JimpPkg.default;

import ImageDatabase from './image-database.js';

class Avatar {

    _image;
    _imageData;
    get imageData() {
        return this._imageData;
    }

    constructor(eyes, hair, accessory, texture) {
        this._image = ImageDatabase.baseImage.clone();
        this._image.composite(ImageDatabase.eyes[eyes], 0, 0);
        this._image.composite(ImageDatabase.hair[hair], 0, 0);
        this._image.composite(ImageDatabase.accessories[accessory], 0, 0);
        this._image.composite(ImageDatabase.textures[texture], 0, 0, {mode: Jimp.BLEND_MULTIPLY});
    }

    async generateData() {
        try {
            this._imageData = await this._image.getBufferAsync(Jimp.MIME_PNG);
        } catch(error) {
            console.warn(error);
        }
        return;
    }

}

export default Avatar;
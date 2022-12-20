import JimpPkg from 'jimp/es/index.js';
const Jimp = JimpPkg.default;

const ImageDatabase = {
    baseImage: await Jimp.read('./images/players/base.png'),
    textures: [
        await Jimp.read('./images/players/color_0.png'),
        await Jimp.read('./images/players/color_1.png'),
        await Jimp.read('./images/players/color_2.png'),
        await Jimp.read('./images/players/color_3.png'),
        await Jimp.read('./images/players/color_4.png'),
        await Jimp.read('./images/players/color_5.png'),
        await Jimp.read('./images/players/color_6.png'),
        await Jimp.read('./images/players/color_7.png'),
        await Jimp.read('./images/players/color_8.png'),
        await Jimp.read('./images/players/color_9.png'),
        await Jimp.read('./images/players/color_10.png'),
    ],
    eyes: [
        await Jimp.read('./images/players/eyes_1.png'),
        await Jimp.read('./images/players/eyes_2.png'),
        await Jimp.read('./images/players/eyes_3.png'),
        await Jimp.read('./images/players/eyes_4.png'),
        await Jimp.read('./images/players/eyes_5.png'),
        await Jimp.read('./images/players/eyes_6.png'),
        await Jimp.read('./images/players/eyes_7.png'),
        await Jimp.read('./images/players/eyes_8.png'),
    ],
    hair: [
        await Jimp.read('./images/players/hair_0.png'),
        await Jimp.read('./images/players/hair_1.png'),
        await Jimp.read('./images/players/hair_2.png'),
        await Jimp.read('./images/players/hair_3.png'),
        await Jimp.read('./images/players/hair_4.png'),
        await Jimp.read('./images/players/hair_5.png'),
        await Jimp.read('./images/players/hair_6.png'),
        await Jimp.read('./images/players/hair_7.png'),
    ],
    accessories: [
        await Jimp.read('./images/players/acc_0.png'),
        await Jimp.read('./images/players/acc_1.png'),
        await Jimp.read('./images/players/acc_2.png'),
        await Jimp.read('./images/players/acc_3.png'),
        await Jimp.read('./images/players/acc_4.png'),
        await Jimp.read('./images/players/acc_5.png'),
        await Jimp.read('./images/players/acc_6.png'),
        await Jimp.read('./images/players/acc_7.png'),
        await Jimp.read('./images/players/acc_8.png'),
        await Jimp.read('./images/players/acc_9.png'),
    ]
};

export default ImageDatabase;
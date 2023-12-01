let ImageDrawingUtil = function () {
    let formChannelImage = new Image();
    formChannelImage.src = 'img/form_channel.svg'
    let colorChannelImage = new Image();
    colorChannelImage.src = 'img/color_channel.svg'
    let sizeChannelImage = new Image();
    sizeChannelImage.src = 'img/size_channel.svg'
    let angleChannelImage = new Image();
    angleChannelImage.src = 'img/orientation_channel.svg'
    let positionChannelImage = new Image();
    positionChannelImage.src = 'img/position_channel.svg'

    return {
        formChannelImage,
        colorChannelImage,
        sizeChannelImage,
        angleChannelImage,
        positionChannelImage,
    }
}();
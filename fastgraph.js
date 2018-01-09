
//// Helper functions

Array.prototype.scaleBetween = function (scaledMin, scaledMax) {
    var max = Math.max.apply(Math, this);
    var min = Math.min.apply(Math, this);
    return this.map(function (num) {
        return ((scaledMax - scaledMin) * (num - min) / (max - min + 0.0000001) + scaledMin);
    });
};


Number.prototype.niceDisplay = function () {
    if (this >= 1000000) {
        return Math.round(this/100000)/10 + " M";
    }
    if (this > 1000) {
        return Math.round(this/100)/10 + " K";
    }
    return Math.round(this*10)/10;
};


Array.prototype.average = function() {
    var combined = 0;
    var length = 0;
    for (var i in this) {
        if (this.hasOwnProperty(i)) {
            combined += this[i];
            length++;
        }
    }
    return this.map(function () {
        return combined / length;
    });
};


Array.prototype.toFloat = function () {
    // return this.map(num => parseFloat(num));
    return this.map(function (num) {
        return parseFloat(num);
    });
};


function fit(s, low1, high1, low2, high2) {
    return low2 + (s-low1)*(high2-low2)/(high1-low1);
}




//// The main graph function
function graph (canvasElement, points, labels, userSettings) {

    var settings = {
        graphAverage: false, //calculate a line expressing the average
        graphTrend: false, //calculate a trend line
        rotateYAxisLabels: 20, //degrees. rotate the y axis labels by this amount. Good for dense data.
        labelReductionFactor: 1, //the higher the factor, the higher the reduction
        fillArea: false, //fill the area below the graph?
        graphColor: "#ccc", //the graph line
        areaFillColor: "rgba(63,81,181,0.1)", //graph area fill color
        verticalBarColor: "#cccccc", //the vertical indicators above the y-legends
        xLabelColor: "#888888", //well, the color of the x labels.
        yLabelColor: "#222222" //can you guess?
    };

    // Get canvas context
    var ctx = canvasElement.getContext("2d");
    
    // label font size
    var fontsize = {
        default: ctx.canvas.height/10
    };
    
    if (ctx.canvas.clientWidth != 0) {
        ctx.canvas.width = ctx.canvas.clientWidth*1.6;
    }

    if (ctx.canvas.clientHeight != 0) {
        ctx.canvas.height = ctx.canvas.clientHeight*1.6;
    }

    var res = {
        x: ctx.canvas.width,
        y: ctx.canvas.height
    };
    
    var margins = {
        bottom: ctx.canvas.height/8,
        top: ctx.canvas.height/4,
        left: ctx.canvas.width/64,
        right: ctx.canvas.width/16,
    }

    // var points = binding.value[0].toFloat();
    // var labels = binding.value[1];

    // GRAPH
    function drawChart(pts, lbls, color) {

        //pre-calculate scaled points for display
        var pointY = pts.scaleBetween(res.y-margins.bottom-margins.top/2, margins.top)
        var pointX = [...Array(pts.length).keys()].scaleBetween(margins.left, res.x-margins.right);
        
        function labelExtremes(originalPoints, transformedPoints, context, color, xOffset, prefix)  {
            if (xOffset == undefined) {xOffset=0;}
            if (prefix == undefined) {prefix="";}
            // Draw value labels on the curve on minima/maxima
            var lastPoint;
            var bounds = {
                min: Math.min(...originalPoints),
                max: Math.max(...originalPoints)
            };  
            for (var op in originalPoints) {
                // is lowest or highest value?
                if (originalPoints.hasOwnProperty(op)) {
                    if (op == 0 || (originalPoints[op] == bounds.max || originalPoints[op] == bounds.min)) {
                        if (originalPoints[op] != lastPoint) {
                            context.fillStyle = color;
                            context.font = fontsize.default + "px Arial";
                            context.save();
                            context.translate(pointX[op] + xOffset, transformedPoints[op] * 0.95);
                            context.rotate(-settings.rotateYAxisLabels*(Math.PI / 180));
                            context.fillText(prefix + " " + originalPoints[op].niceDisplay(), 0, 0);
                            context.restore();
                            lastPoint = originalPoints[op];
                        }
                    }
                }
            }
        }


        ctx.beginPath();
        if (settings.fillArea) {
            ctx.moveTo(margins.left, res.y-margins.bottom);
        } else {
            ctx.moveTo(margins.left, pointY[0]);
        }

        for (var op = 0; op < pts.length; op++) {
            ctx.lineTo(pointX[op], pointY[op]);
        }
        
        // Either fill or draw a stroke
        if (settings.fillArea) {
            ctx.lineTo(res.x-margins.right, res.y-margins.bottom);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        } else {
            ctx.strokeStyle = settings.graphColor;
            ctx.stroke();
        }

        // overlay average
        /* The reason we do not reuse the graph and do it outside is the fact that
        we auto-scale the graph each frame based on it's values.*/
        if (settings.graphAverage) {
            var avgColor = '#222299'
            var avgPointY = pointY.average();
            var avgValue = pts.average();
            ctx.beginPath();
            ctx.moveTo(margins.left, avgPointY[0]);
            for (var op = 0; op < pts.length; op++) {
                ctx.lineTo(pointX[op], avgPointY[op]);
            }
            ctx.strokeStyle = avgColor;
            ctx.stroke();
            labelExtremes(avgValue, avgPointY, ctx, avgColor, 50, 'AVG');
        }

        // if (graphTrend) {
        //     var trendPointY = regression(pointX, pointY)[0];
        //     console.log(trendPointY);

        //     ctx.beginPath();
        //     ctx.moveTo(margins.left, trendPointY[0]);
        //     for (var i = 0; i < pts.length; i++) {
        //         ctx.lineTo(pointX[i], trendPointY[i]);
        //     }
        //     ctx.strokeStyle="#FF0000";
        //     ctx.stroke();
        //     labelExtremes(trendPointY, ctx, "#FF0000");
        // }


        labelExtremes(pts, pointY, ctx, settings.yLabelColor);

        var nth = 0;
        var reducer = Math.round(fit(pts.length, 0, 80, 1, settings.labelReductionFactor));
        // console.log('reducer', reducer);
        for (var op = 0; op < pts.length; op++) {
            
            if (nth == reducer || op == 0) {
                nth = 0;
                //vertical bars
                ctx.fillStyle = settings.verticalBarColor;
                ctx.fillRect(pointX[op], res.y-margins.bottom, 1, margins.bottom + -(res.y-pointY[op]));
                //label
                ctx.fillStyle = settings.xLabelColor;
                ctx.fillText(lbls[op], pointX[op], res.y - margins.bottom / 2);
            }
            nth ++;
        }
    }


    drawChart(points, labels, settings.areaFillColor);

}


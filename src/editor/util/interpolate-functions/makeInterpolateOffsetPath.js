
import PathParser from "../../parse/PathParser";
import makeInterpolateOffset from "./offset-path/makeInterpolateOffset";
import { Length } from "../../unit/Length";
import { calculateAngle } from "../../../util/functions/math";
import { Transform } from "../../css-property/Transform";
import PolygonParser from "../../parse/PolygonParser";

export function makeInterpolateOffsetPath(layer, property, startValue, endValue, container) {

    var [id, distance, rotateStatus, rotate] = startValue.split(',').map(it =>it.trim());

    var startObject = {id, distance: Length.parse(distance || '0%'), rotateStatus: rotateStatus || 'auto', rotate: Length.parse(rotate || '0deg') }

    // var artboard = editor.selection.currentArtboard
    var innerInterpolate = (rate, t) => {
        return { x, y }
    }

    var innerInterpolateAngle = (rotateStatus, currentAngle) => {

        switch (rotateStatus) {
        case 'angle': return startObject.rotate.value;
        case 'auto angle': return currentAngle + startObject.rotate.value; 
        case 'reverse': return currentAngle + 180;
        case 'auto' : return currentAngle;
        default: return; 
        }
    }

    var screenX = 0, screenY = 0

    if (container) {
        var svgLayer = container.$(`[data-id="${startObject.id}"]`)

        var isPath = true; 
        var pathLayer = svgLayer.$('path');    
        if (svgLayer.hasClass('polygon')) {
            var isPath = false ; 
            var pathLayer = svgLayer.$('polygon');
        }
        var rect = svgLayer.rect();
        // parser.translate(pathLayer.screenX.value, pathLayer.screenY.value)
        screenX = rect.left
        screenY = rect.top

        innerInterpolate = (rate, t, timing) => {
            // console.log(pathLayer, pathLayer.attr('d'),  pathLayer.css('d'))
            if (isPath) {
                var parser = new PathParser(pathLayer.attr('d'));
            } else {
                var polygonParser = new PolygonParser (pathLayer.attr('points'));
                var parser = new PathParser(polygonParser.toPathString());
            }

            var {totalLength, interpolateList} = makeInterpolateOffset(parser.segments); 

            var distance = startObject.distance.toPx(totalLength)
            var dt = distance / totalLength;

            t = (t + dt )

            if (t > 1) {
                t -= 1; 
            }

            var obj = interpolateList[0]    
            if (t === 0) {
                obj = interpolateList[0]    
            } else if (t === 1) {
                obj = interpolateList[interpolateList.length-1]    
            }

            var arr = interpolateList.find(it => {
                return it.startT <= t && t < it.endT
            });

            if (arr) {
                obj = arr
            }

            // console.log(obj);
            
            var newT = (t - obj.startT)/(obj.endT - obj.startT)
            var newRate = timing(newT)

            // console.log(newT, newRate, t, obj.startT, obj.endT);

            return {
                ...obj.interpolate(newRate, newT, timing),
                totalLength: obj.totalLength
            }
        }

    }

    return (rate, t, timing) => {

        // apply tranform-origin in real time 

        var arr = (layer.css('transform-origin') || '50% 50%').split(' ').map(it => Length.parse(it))
        var tx = arr[0].toPx(Length.parse(layer.css('width')).value);
        var ty = arr[1].toPx(Length.parse(layer.css('height')).value);

        var obj = innerInterpolate(rate, t, timing); 

        var results = {
            left: Length.px(obj.x + screenX - tx.value),
            top: Length.px(obj.y + screenY - ty.value)
        }

        if (startObject.rotateStatus === 'element') {

        } else {
            var current = obj
            var next = innerInterpolate(rate + 1/obj.totalLength, t + 1/obj.totalLength, timing); 
            var angle = calculateAngle(next.x - current.x, next.y - current.y)

            var newAngle = Length.deg(innerInterpolateAngle(startObject.rotateStatus, angle))

            results.transform = Transform.replace(layer.el.style['transform'], { type: 'rotate', value: [ newAngle] })
        }


        return results;
    }

}

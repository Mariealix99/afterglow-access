export function round(value: number, digits: number) {
    if(!value) return;
    return Math.round(value*Math.pow(10, digits))/Math.pow(10, digits)
}
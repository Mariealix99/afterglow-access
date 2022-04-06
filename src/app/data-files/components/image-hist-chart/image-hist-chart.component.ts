import { Component, OnInit, ViewChild, OnChanges, Input, Output, EventEmitter, ChangeDetectorRef, ElementRef, HostListener, OnDestroy } from '@angular/core';

// declare let d3, nv: any;
// import { NvD3Component } from "ng2-nvd3";

import { ImageHist, getBinCenter, calcLevels, getCountsPerBin } from '../../models/image-hist';
import { ThemePicker } from '../../../theme-picker';
import { ThemeStorage, PlotlyTheme } from '../../../theme-picker/theme-storage/theme-storage';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Normalization } from '../../models/normalization';
import { PixelNormalizer } from '../../models/pixel-normalizer';
import { blueColorMap, greenColorMap, redColorMap } from '../../models/color-map';

@Component({
  selector: 'app-image-hist-chart',
  // template:
  //   '<nvd3 id="hist-chart" class="" [options]="chartOptions" [data]="chartData"></nvd3>',
  templateUrl: './image-hist-chart.html',
  styleUrls: ['./image-hist-chart.component.scss'],
})
export class ImageHistChartComponent implements OnInit, OnChanges, OnDestroy {
  // @ViewChild(NvD3Component) nvD3: NvD3Component;

  @Input() data: { hist: ImageHist, normalizer: PixelNormalizer }[] = [];
  @Input() width: number;
  @Input() height: number;
  @Input() backgroundLevel: number = 0;
  @Input() peakLevel: number = 0;

  private yMax = 0;
  public logarithmicX: boolean = false;
  public logarithmicY: boolean = false;
  private observer: ResizeObserver;

  public chartData: Array<any> = [];
  public layout: Partial<any> = {
    width: null,
    height: null,
    title: {
      text: 'Histogram',
      // font: {
      //   family: 'Courier New, monospace',
      //   size: 24
      // },
      // xref: 'paper',
      // x: 0.05,
    },
    xaxis: {
      autorange: true,
      title: {
        text: 'Pixel Value',
        // font: {
        //   family: 'Courier New, monospace',
        //   size: 18,
        //   color: '#7f7f7f'
        // }
      },
    },
    yaxis: {
      autorange: true,
      title: {
        text: '# of Pixels In Bin',
        // font: {
        //   family: 'Courier New, monospace',
        //   size: 18,
        //   color: '#7f7f7f'
        // }
      },
    },
    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 50,
    },
  };
  public theme: PlotlyTheme;

  public logXButton = {
    name: 'Toggle Log-X',
    click: () => {
      this.logarithmicX = !this.logarithmicX;
      this.updateChart();
      this._changeDetectorRef.detectChanges();
    },
    icon: {
      width: 24,
      height: 24,
      path:
        'M7.77 6.76L6.23 5.48.82 12l5.41 6.52 1.54-1.28L3.42 12l4.35-5.24zM7 13h2v-2H7v2zm10-2h-2v2h2v-2zm-6 2h2v-2h-2v2zm6.77-7.52l-1.54 1.28L20.58 12l-4.35 5.24 1.54 1.28L23.18 12l-5.41-6.52z',
    },
  };

  public logYButton = {
    name: 'Toggle Log-Y',
    click: () => {
      this.logarithmicY = !this.logarithmicY;
      this.updateChart();
      this._changeDetectorRef.detectChanges();
    },
    icon: {
      width: 24,
      height: 24,
      path:
        'M7.77 6.76L6.23 5.48.82 12l5.41 6.52 1.54-1.28L3.42 12l4.35-5.24zM7 13h2v-2H7v2zm10-2h-2v2h2v-2zm-6 2h2v-2h-2v2zm6.77-7.52l-1.54 1.28L20.58 12l-4.35 5.24 1.54 1.28L23.18 12l-5.41-6.52z',
      transform: 'rotate(90 12 12)',
    },
  };

  // https://github.com/plotly/plotly.js/blob/master/src/components/modebar/buttons.js

  public config: Partial<any> = {
    scrollZoom: true,
    displaylogo: false,
    modeBarButtons: [
      [this.logXButton, this.logYButton],
      ['toImage', 'zoomIn2d', 'zoomOut2d', 'autoScale2d'],
    ],
  };

  constructor(private themeStorage: ThemeStorage, private _changeDetectorRef: ChangeDetectorRef, private element: ElementRef<HTMLElement>) {
    this.theme = themeStorage.getCurrentColorTheme().plotlyTheme;
    themeStorage.onThemeUpdate.subscribe(() => {
      this.theme = themeStorage.getCurrentColorTheme().plotlyTheme;
      this._changeDetectorRef.detectChanges();
    });
  }


  ngOnInit() {
    this.observer = new ResizeObserver(() => {
      console.log("SIZE CHANGE")
      this.updateChart()
    });
    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy() {
    this.observer.unobserve(this.element.nativeElement);
  }

  onXAxisTypeChange($event: MatCheckboxChange) {
    this.logarithmicX = $event.checked;

    this.updateChart();
  }

  onYAxisTypeChange($event: MatCheckboxChange) {
    this.logarithmicY = $event.checked;
    this.updateChart();
  }

  updateChart() {
    let markerColors = {}
    markerColors[redColorMap.name] = '#dc3912'
    markerColors[greenColorMap.name] = '#109618'
    markerColors[blueColorMap.name] = '#3366cc'

    this.chartData = [];
    let data = this.data.filter(({ hist, normalizer }) => hist && normalizer && hist.loaded && hist.data)
    data.forEach(({ hist, normalizer }) => {

      // let refBinSize = Math.max(...data.map(d => getCountsPerBin(d.hist)))
      // let binSize = getCountsPerBin(hist)


      let x = [];
      let y = [];
      for (let i = 0; i < hist.data.length; i++) {
        if (hist.data[i] <= 0 || (this.logarithmicX && getBinCenter(hist, i) <= 0)) continue;
        x.push(getBinCenter(hist, i) * normalizer.channelScale + normalizer.channelOffset);
        // y.push(hist.data[i] / normalizer.channelScale * (refBinSize / binSize));
        y.push(hist.data[i] / normalizer.channelScale);
        if (this.yMax < y[y.length - 1]) this.yMax = y[y.length - 1];
      }

      let d = {
        x: x,
        y: y,
        // fill: "tozeroy",
        type: 'scatter',
        marker: {}
        // mode: "none"
      }


      let markerColor = markerColors[normalizer.colorMapName];
      if (markerColor) {
        d.marker = {
          color: markerColor,
          line: {
            color: markerColor
          }
        }
      }

      this.chartData.push(d);

    })

    let width = this.width || this.element?.nativeElement?.getBoundingClientRect().width
    let height = this.height || this.element?.nativeElement?.getBoundingClientRect().height

    if (this.layout.width != width) this.layout.width = width;
    if (this.layout.height != height) this.layout.height = height;

    // let levels = calcLevels(hist, this.backgroundPercentile, this.peakPercentile);
    let levels = { backgroundLevel: this.backgroundLevel, peakLevel: this.peakLevel }

    let shapes: any[] = [];
    if (levels.backgroundLevel) {
      shapes.push(
        {
          type: 'line',
          x0: !this.logarithmicX ? levels.backgroundLevel : Math.max(levels.backgroundLevel, 0.1),
          y0: 0,
          x1: !this.logarithmicX ? levels.backgroundLevel : Math.max(levels.backgroundLevel, 0.1),
          y1: this.yMax,
          line: {
            color: 'red',
            width: 2,
            dash: 'dot',
          },
        },
      )
    }
    if (levels.peakLevel) {
      shapes.push(
        {
          type: 'line',
          x0: !this.logarithmicX ? levels.peakLevel : Math.max(levels.peakLevel, 0.1),
          y0: 0,
          x1: !this.logarithmicX ? levels.peakLevel : Math.max(levels.peakLevel, 0.1),
          y1: this.yMax,
          line: {
            color: 'red',
            width: 2,
            dash: 'dot',
          },
        }
      )
    }

    let xMin: number, xMax: number, yMax: number;
    this.data.forEach(({ hist, normalizer }) => {
      if (!hist.loaded) return;
      let { backgroundLevel, peakLevel } = calcLevels(hist, 1, 99);
      if (normalizer.backgroundLevel !== undefined) backgroundLevel = Math.min(backgroundLevel, normalizer.backgroundLevel)
      if (normalizer.peakLevel !== undefined) peakLevel = Math.max(peakLevel, normalizer.peakLevel)

      let x0 = backgroundLevel * normalizer.channelScale + normalizer.channelOffset
      let x1 = peakLevel * normalizer.channelScale + normalizer.channelOffset
      let y1 = Math.max(...hist.data) / normalizer.channelScale;
      if (xMin === undefined || x0 < xMin) xMin = x0
      if (xMax === undefined || x1 > xMax) xMax = x1
      if (yMax === undefined || y1 > yMax) yMax = y1
    })

    if (xMin !== undefined && xMax !== undefined) {
      let b = (xMax - xMin) * 0.1;
      let xRange = [xMin - b, xMax + b]
      // let xRange = this.layout.xaxis?.range;
      // if (!xRange) {
      //   xRange = [xMin, xMax]
      // }
      // else {
      //   if (xRange[0] > xMax || xRange[1] < xMin) {
      //     xRange[0] = xMin;
      //     xRange[1] = xMax;
      //   }
      // }

      this.layout.xaxis = {
        ...this.layout.xaxis,
        autorange: false,
        range: xRange
      }

    }

    if (yMax !== undefined) {
      let b = yMax * 0.1;
      let yRange = [0, yMax + b];
      // let yRange = this.layout.yaxis?.range;
      // if (!yRange) {
      //   yRange = [0, yMax]
      // }
      // else {
      //   if (yRange[0] < yMax) yRange[1] = yMax;
      // }

      this.layout.yaxis = {
        ...this.layout.yaxis,
        autorange: false,
        range: yRange
      }
    }


    this.layout = {
      ...this.layout,
      showlegend: false,
      xaxis: {
        ...this.layout.xaxis,
        type: this.logarithmicX ? 'log' : 'linear',

      },
      yaxis: {
        ...this.layout.yaxis,
        type: this.logarithmicY ? 'log' : 'linear',
      },
      shapes: shapes,
    };

  }

  ngOnChanges() {
    this.updateChart();
  }
}

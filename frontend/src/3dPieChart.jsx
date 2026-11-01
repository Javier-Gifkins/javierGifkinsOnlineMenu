import * as React from 'react';
import {
  PieSeries3D,
  CircularChartDataLabel3D,
  CircularChartLegend3D,
  CircularChartTooltip3D,
  CircularChartHighlight3D,
  CircularChart3DComponent,
  CircularChart3DSeriesCollectionDirective,
  CircularChart3DSeriesDirective,
  Inject,
} from '@syncfusion/ej2-react-charts';
import { Browser } from '@syncfusion/ej2-base';

const nutritionPalette = ['#7ecf9d', '#f5d76e', '#f39b72', '#79c2ff'];

const NutritionPieChart = ({ data = [], title = 'Nutrition' }) => {
  const chartData = (data || [])
    .filter((entry) => Number.isFinite(Number(entry?.y)) && Number(entry.y) > 0)
    .map((entry) => ({
      x: entry.x,
      y: Number(entry.y),
      text: `${entry.x}: ${entry.y}g`,
    }));

  if (!chartData.length) {
    return <div className="nutrition-chart-empty">No nutrition data available.</div>;
  }

  return (
    <div className="nutrition-chart">
      <CircularChart3DComponent
        id="nutrition-chart"
        style={{ textAlign: 'center', width: '100%' }}
        legendSettings={{ visible: true, position: 'Bottom' }}
        tilt={-35}
        enableRotation={true}
        enableAnimation={true}
        title={title}
        tooltip={{
          enable: true,
          format: '<b>${point.x}</b><br> ${point.y}g',
          header: '',
        }}
      >
        <Inject services={[PieSeries3D, CircularChartDataLabel3D, CircularChartLegend3D, CircularChartTooltip3D, CircularChartHighlight3D]} />
        <CircularChart3DSeriesCollectionDirective>
          <CircularChart3DSeriesDirective
            dataSource={chartData}
            xName="x"
            yName="y"
            explode={true}
            innerRadius="0%"
            radius={Browser.isDevice ? '55%' : '75%'}
            explodeOffset={Browser.isDevice ? '8%' : '18%'}
            palettes={nutritionPalette}
            dataLabel={{
              visible: true,
              position: 'Outside',
              name: 'x',
              font: { fontWeight: '600' },
              connectorStyle: { length: Browser.isDevice ? '12px' : '24px' },
            }}
          />
        </CircularChart3DSeriesCollectionDirective>
      </CircularChart3DComponent>
    </div>
  );
};

export default NutritionPieChart;

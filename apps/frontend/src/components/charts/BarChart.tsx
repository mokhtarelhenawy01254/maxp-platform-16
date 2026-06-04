import React from 'react';
import {
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface BarChartProps {
    data: any[];
    xKey: string;
    bars: {
        key: string;
        name: string;
        color: string;
    }[];
    height?: number;
    showLegend?: boolean;
    showGrid?: boolean;
    layout?: 'horizontal' | 'vertical';
}

const BarChart: React.FC<BarChartProps> = ({
    data,
    xKey,
    bars,
    height = 300,
    showLegend = true,
    showGrid = true,
    layout = 'horizontal',
}) => {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsBarChart
                data={data}
                layout={layout}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
                {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                {layout === 'horizontal' ? (
                    <>
                        <XAxis dataKey={xKey} />
                        <YAxis />
                    </>
                ) : (
                    <>
                        <XAxis type="number" />
                        <YAxis dataKey={xKey} type="category" />
                    </>
                )}
                <Tooltip />
                {showLegend && <Legend />}
                {bars.map((bar) => (
                    <Bar
                        key={bar.key}
                        dataKey={bar.key}
                        fill={bar.color}
                        name={bar.name}
                    />
                ))}
            </RechartsBarChart>
        </ResponsiveContainer>
    );
};

export default BarChart;

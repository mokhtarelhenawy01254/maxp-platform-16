import React from 'react';
import {
    LineChart as RechartsLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface LineChartProps {
    data: any[];
    xKey: string;
    lines: {
        key: string;
        name: string;
        color: string;
    }[];
    height?: number;
    showLegend?: boolean;
    showGrid?: boolean;
}

const LineChart: React.FC<LineChartProps> = ({
    data,
    xKey,
    lines,
    height = 300,
    showLegend = true,
    showGrid = true,
}) => {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsLineChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
                {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis dataKey={xKey} />
                <YAxis />
                <Tooltip />
                {showLegend && <Legend />}
                {lines.map((line) => (
                    <Line
                        key={line.key}
                        type="monotone"
                        dataKey={line.key}
                        stroke={line.color}
                        name={line.name}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                ))}
            </RechartsLineChart>
        </ResponsiveContainer>
    );
};

export default LineChart;

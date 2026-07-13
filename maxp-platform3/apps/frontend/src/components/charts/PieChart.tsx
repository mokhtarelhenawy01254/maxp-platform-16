import React from 'react';
import {
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
} from 'recharts';
import DeferredResponsiveContainer from '../ui/DeferredResponsiveContainer';

interface PieChartProps {
    data: {
        name: string;
        value: number;
    }[];
    colors: string[];
    height?: number;
    showLegend?: boolean;
    showLabels?: boolean;
}

const PieChart: React.FC<PieChartProps> = ({
    data,
    colors,
    height = 300,
    showLegend = true,
    showLabels = true,
}) => {
    const renderLabel = (entry: any) => {
        if (!showLabels) return null;
        return `${entry.name}: ${entry.value.toLocaleString()}`;
    };

    return (
        <DeferredResponsiveContainer width="100%" height={height}>
            <RechartsPieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={showLabels}
                    label={renderLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                </Pie>
                <Tooltip />
                {showLegend && <Legend />}
            </RechartsPieChart>
        </DeferredResponsiveContainer>
    );
};

export default PieChart;

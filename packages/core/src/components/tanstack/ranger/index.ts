// Ranger components
export {
  RangeSlider,
  MultiRangeSlider,
  ColorRangeSlider,
} from './Ranger';
export type {
  RangeSliderProps,
  MultiRangeSliderProps,
  ColorRangeSliderProps,
} from './Ranger';

// Re-export core types from @tanstack/react-ranger
export type {
  RangerOptions,
  RangerInstance,
  Handle,
  Segment,
} from '@tanstack/react-ranger';

// Example implementations
import React from 'react';
import { ColorRangeSlider, MultiRangeSlider, RangeSlider } from './Ranger';

// Example: Simple range slider
export const ExampleRangeSlider = () => {
  const [value, setValue] = React.useState([50]);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Simple Range Slider</h3>
      <RangeSlider
        min={0}
        max={100}
        values={value}
        onChange={setValue}
        showValues
        showTicks
        ticks={[0, 25, 50, 75, 100]}
      />
      <p className="text-sm text-muted-foreground">Value: value[0]</p>
    </div>
  );
};

// Example: Dual range slider (min/max)
export const ExampleDualRangeSlider = () => {
  const [values, setValues] = React.useState([25, 75]);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Dual Range Slider</h3>
      <RangeSlider
        min={0}
        max={100}
        values={values}
        onChange={setValues}
        showValues
        ariaLabels={['Minimum value', 'Maximum value']}
      />
      <p className="text-sm text-muted-foreground">
        Range: values[0]- {values[1]}
      </p>
    </div>
  );
};

// Example: Multi-range slider
export const ExampleMultiRangeSlider = () => {
  const [ranges, setRanges] = React.useState([
    { start: 10, end: 30 },
    { start: 40, end: 60 },
    { start: 70, end: 90 },
  ]);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Multi-Range Slider</h3>
      <MultiRangeSlider
        min={0}
        max={100}
        ranges={ranges}
        onChange={setRanges}
        labels={['Morning', 'Afternoon', 'Evening']}
        minDistance={10}
        maxRanges={5}
      />
    </div>
  );
};

// Example: Price range filter
export const ExamplePriceRangeFilter = () => {
  const [priceRange, setPriceRange] = React.useState([0, 1000]);

  const formatter = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Price Filter</h3>
      <RangeSlider
        min={0}
        max={5000}
        step={50}
        values={priceRange}
        onChange={setPriceRange}
        formatter={formatter}
        showValues
        className="mt-8"
      />
      <div className="flex justify-between text-sm">
        <span>Min: formatter(priceRange[0])</span>
        <span>Max: formatter(priceRange[1])</span>
      </div>
    </div>
  );
};

// Example: Volume control
export const ExampleVolumeControl = () => {
  const [volume, setVolume] = React.useState([70]);

  const getVolumeIcon = (value: number) => {
    if (value === 0) return '🔇';
    if (value < 33) return '🔈';
    if (value < 66) return '🔉';
    return '🔊';
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Volume Control</h3>
      <div className="flex items-center gap-4">
        <span className="text-2xl">{getVolumeIcon(volume[0])}</span>
        <RangeSlider
          min={0}
          max={100}
          values={volume}
          onChange={setVolume}
          className="flex-1"
          formatter={(v) => `${v}%`}
        />
        <span className="w-12 text-right text-sm font-medium">
          {volume[0]}%
        </span>
      </div>
    </div>
  );
};

// Example: Color picker
export const ExampleColorPicker = () => {
  const [color, setColor] = React.useState({
    hue: 180,
    saturation: 70,
    lightness: 50,
  });

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Color Picker</h3>
      <ColorRangeSlider
        hue={color.hue}
        saturation={color.saturation}
        lightness={color.lightness}
        onChange={setColor}
      />
    </div>
  );
};

// Example: Time range selector
export const ExampleTimeRangeSelector = () => {
  const [timeRange, setTimeRange] = React.useState([480, 1020]); // 8:00 AM - 5:00 PM in minutes

  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours || 12;
    return `$displayHours:$mins.toString().padStart(2, '0')$period`;
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Business Hours</h3>
      <RangeSlider
        min={0}
        max={1440} // 24 hours in minutes
        step={15} // 15-minute intervals
        values={timeRange}
        onChange={setTimeRange}
        formatter={minutesToTime}
        showTicks
        ticks={[0, 360, 720, 1080, 1440]} // Midnight, 6AM, Noon, 6PM, Midnight
        className="mt-8"
      />
      <p className="text-sm text-muted-foreground text-center">
        {minutesToTime(timeRange[0])} - {minutesToTime(timeRange[1])}
      </p>
    </div>
  );
};

// Example: Custom styled slider
export const ExampleCustomStyledSlider = () => {
  const [value, setValue] = React.useState([30]);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Custom Styled Slider</h3>
      <RangeSlider
        min={0}
        max={100}
        values={value}
        onChange={setValue}
        trackClassName="h-2 bg-gradient-to-r from-blue-200 to-blue-300"
        rangeClassName="bg-gradient-to-r from-blue-500 to-purple-500"
        handleClassName="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 border-white border-4"
        tooltipClassName="bg-gradient-to-r from-blue-500 to-purple-500"
      />
    </div>
  );
};
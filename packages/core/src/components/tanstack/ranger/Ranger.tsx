import { type RangerOptions, useRanger } from '@tanstack/react-ranger';
import React from 'react';
import { cn } from '../../../utils/cn';

export interface RangeSliderProps {
  min: number;
  max: number;
  values: number[];
  onChange: (values: number[]) => void;
  step?: number;
  ticks?: number[];
  showTicks?: boolean;
  showValues?: boolean;
  showTooltip?: boolean;
  disabled?: boolean;
  className?: string;
  trackClassName?: string;
  rangeClassName?: string;
  handleClassName?: string;
  tickClassName?: string;
  valueClassName?: string;
  tooltipClassName?: string;
  orientation?: 'horizontal' | 'vertical';
  reversed?: boolean;
  interpolator?: RangerOptions<any>['interpolator'];
  formatter?: (value: number) => string;
  ariaLabels?: string[];
}

export function RangeSlider({
  min,
  max,
  values,
  onChange,
  step = 1,
  ticks,
  showTicks = false,
  showValues = false,
  showTooltip = true,
  disabled = false,
  className,
  trackClassName,
  rangeClassName,
  handleClassName,
  tickClassName,
  valueClassName,
  tooltipClassName,
  orientation = 'horizontal',
  reversed = false,
  interpolator,
  formatter = (value) => value.toString(),
  ariaLabels = [],
}: RangeSliderProps) {
  const rangerRef = React.useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const rangerInstance = useRanger({
    min,
    max,
    stepSize: step,
    values,
    onChange,
    onDrag: (values) => {
      onChange(values);
    },
    interpolator,
  });

  const { getTrackProps, segments, handles, activeHandleIndex } = rangerInstance;

  React.useEffect(() => {
    setActiveIndex(activeHandleIndex);
  }, [activeHandleIndex]);

  const isVertical = orientation === 'vertical';
  const dimensionKey = isVertical ? 'height' : 'width';
  const positionKey = isVertical ? 'bottom' : 'left';
  const sizeKey = isVertical ? 'height' : 'width';

  return (
    <div
      className={cn(
        'relative',
        isVertical ? 'h-64 w-8' : 'w-full h-8',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* Values display */}
      {showValues && (
        <div
          className={cn(
            'absolute flex justify-between text-sm',
            isVertical ? 'right-12 top-0 bottom-0 flex-col' : 'left-0 right-0 -top-6',
            valueClassName
          )}
        >
          <span>{formatter(min)}</span>
          <span>{formatter(max)}</span>
        </div>
      )}

      {/* Track */}
      <div
        {...getTrackProps({
          ref: rangerRef,
          disabled,
        })}
        className={cn(
          'relative',
          isVertical ? 'h-full w-1' : 'w-full h-1',
          'bg-gray-200 rounded-full',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          trackClassName
        )}
        style={{
          [dimensionKey]: '100%',
        }}
      >
        {/* Ticks */}
        {showTicks && ticks && (
          <div className="absolute inset-0">
            {ticks.map((tick) => {
              const percentage = ((tick - min) / (max - min)) * 100;
              const position = reversed ? 100 - percentage : percentage;

              return (
                <div
                  key={tick}
                  className={cn(
                    'absolute bg-gray-400',
                    isVertical ? 'w-2 h-0.5' : 'h-2 w-0.5',
                    tickClassName
                  )}
                  style={{
                    [positionKey]: `${position}%`,
                    transform: isVertical ? 'translateX(-25%)' : 'translateY(-25%)',
                  }}
                >
                  <span
                    className={cn(
                      'absolute text-xs text-gray-600',
                      isVertical ? 'left-4 -translate-y-1/2' : 'top-4 -translate-x-1/2'
                    )}
                  >
                    {formatter(tick)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Segments (ranges between handles) */}
        {segments.map(({ getSegmentProps }, i) => {
          const isActive = i === 0 && values.length === 1;
          const isMiddle = i > 0 && i < segments.length - 1;

          return (
            <div
              key={i}
              {...getSegmentProps()}
              className={cn(
                'absolute',
                isVertical ? 'w-full' : 'h-full',
                isActive || isMiddle ? 'bg-primary' : 'bg-transparent',
                rangeClassName
              )}
            />
          );
        })}

        {/* Handles */}
        {handles.map(({ value, active, getHandleProps }, i) => {
          const percentage = ((value - min) / (max - min)) * 100;
          const position = reversed ? 100 - percentage : percentage;
          const isHovered = hoveredIndex === i;
          const isActive = activeIndex === i || active;

          return (
            <button
              key={i}
              {...getHandleProps({
                onMouseEnter: () => setHoveredIndex(i),
                onMouseLeave: () => setHoveredIndex(null),
              })}
              aria-label={ariaLabels[i] || `Range handle ${i + 1}`}
              aria-valuenow={value}
              aria-valuemin={min}
              aria-valuemax={max}
              className={cn(
                'absolute',
                'w-5 h-5 bg-white border-2 border-primary rounded-full',
                'shadow-md transition-all duration-150',
                isActive && 'scale-110 shadow-lg',
                isHovered && !isActive && 'scale-105',
                disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                handleClassName
              )}
              style={{
                [positionKey]: `${position}%`,
                transform: isVertical ? 'translateX(-50%)' : 'translateX(-50%) translateY(-50%)',
                top: isVertical ? 'auto' : '50%',
                zIndex: isActive ? 10 : 5,
              }}
              disabled={disabled}
            >
              {/* Tooltip */}
              {showTooltip && (isHovered || isActive) && (
                <span
                  className={cn(
                    'absolute px-2 py-1 text-xs text-white bg-gray-900 rounded',
                    'whitespace-nowrap pointer-events-none',
                    isVertical
                      ? 'right-8 top-1/2 -translate-y-1/2'
                      : 'bottom-8 left-1/2 -translate-x-1/2',
                    tooltipClassName
                  )}
                >
                  {formatter(value)}
                  <span
                    className={cn(
                      'absolute w-0 h-0 border-4 border-transparent',
                      isVertical
                        ? 'left-full top-1/2 -translate-y-1/2 border-l-gray-900'
                        : 'top-full left-1/2 -translate-x-1/2 border-t-gray-900'
                    )}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Multi-range slider with custom styling
export interface MultiRangeSliderProps extends Omit<RangeSliderProps, 'values' | 'onChange'> {
  ranges: Array<{ start: number; end: number }>;
  onChange: (ranges: Array<{ start: number; end: number }>) => void;
  colors?: string[];
  labels?: string[];
  minDistance?: number;
  maxRanges?: number;
  allowOverlap?: boolean;
}

export function MultiRangeSlider({
  min,
  max,
  ranges,
  onChange,
  colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'],
  labels = [],
  minDistance = 0,
  maxRanges = 4,
  allowOverlap = false,
  ...props
}: MultiRangeSliderProps) {
  // Flatten ranges to values array
  const values = ranges.flatMap((range) => [range.start, range.end]);

  const handleChange = (newValues: number[]) => {
    // Convert back to ranges
    const newRanges: Array<{ start: number; end: number }> = [];

    for (let i = 0; i < newValues.length; i += 2) {
      if (i + 1 < newValues.length) {
        let start = newValues[i];
        let end = newValues[i + 1];

        // Ensure min distance
        if (minDistance > 0 && end - start < minDistance) {
          end = start + minDistance;
        }

        // Prevent overlap if not allowed
        if (!allowOverlap && newRanges.length > 0) {
          const prevRange = newRanges[newRanges.length - 1];
          if (start < prevRange.end) {
            start = prevRange.end;
            end = Math.max(end, start + minDistance);
          }
        }

        newRanges.push({ start, end });
      }
    }

    onChange(newRanges);
  };

  return (
    <div className="space-y-4">
      {/* Range labels */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ranges.map((range, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
              <div className={cn('w-3 h-3 rounded-full', colors[i % colors.length])} />
              <span className="text-sm">
                {labels[i] || `Range ${i + 1}`}: {range.start} - {range.end}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Slider */}
      <RangeSlider
        {...props}
        min={min}
        max={max}
        values={values}
        onChange={handleChange}
        rangeClassName={cn(
          'transition-colors duration-200',
          // Custom coloring for each range
          props.rangeClassName
        )}
      />

      {/* Add/Remove range buttons */}
      <div className="flex gap-2">
        {ranges.length < maxRanges && (
          <button
            onClick={() => {
              const lastRange = ranges[ranges.length - 1];
              const newStart = lastRange ? lastRange.end + minDistance : min;
              const newEnd = Math.min(newStart + (max - min) / 10, max);

              onChange([...ranges, { start: newStart, end: newEnd }]);
            }}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Add Range
          </button>
        )}

        {ranges.length > 1 && (
          <button
            onClick={() => {
              onChange(ranges.slice(0, -1));
            }}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Remove Last
          </button>
        )}
      </div>
    </div>
  );
}

// Color picker slider
export interface ColorRangeSliderProps {
  hue: number;
  saturation: number;
  lightness: number;
  onChange: (color: { hue: number; saturation: number; lightness: number }) => void;
  className?: string;
}

export function ColorRangeSlider({
  hue,
  saturation,
  lightness,
  onChange,
  className,
}: ColorRangeSliderProps) {
  const hslToHex = (h: number, s: number, l: number) => {
    const hslToRgb = (h: number, s: number, l: number) => {
      s /= 100;
      l /= 100;
      const k = (n: number) => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [255 * f(0), 255 * f(8), 255 * f(4)].map(Math.round);
    };

    const [r, g, b] = hslToRgb(h, s, l);
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  };

  const currentColor = hslToHex(hue, saturation, lightness);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Color preview */}
      <div className="flex items-center gap-4">
        <div
          className="w-20 h-20 rounded-lg shadow-md border"
          style={{ backgroundColor: currentColor }}
        />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">Current Color</p>
          <p className="text-xs text-muted-foreground">{currentColor}</p>
          <p className="text-xs text-muted-foreground">
            HSL({hue}, {saturation}%, {lightness}%)
          </p>
        </div>
      </div>

      {/* Hue slider */}
      <div>
        <label className="text-sm font-medium mb-2 block">Hue</label>
        <div
          className="relative h-8 rounded"
          style={{
            background: `linear-gradient(to right, 
              hsl(0, 100%, 50%), 
              hsl(60, 100%, 50%), 
              hsl(120, 100%, 50%), 
              hsl(180, 100%, 50%), 
              hsl(240, 100%, 50%), 
              hsl(300, 100%, 50%), 
              hsl(360, 100%, 50%))`,
          }}
        >
          <RangeSlider
            min={0}
            max={360}
            values={[hue]}
            onChange={([h]) => onChange({ hue: h, saturation, lightness })}
            className="absolute inset-0"
            trackClassName="bg-transparent"
            rangeClassName="bg-transparent"
            showTooltip={false}
          />
        </div>
      </div>

      {/* Saturation slider */}
      <div>
        <label className="text-sm font-medium mb-2 block">Saturation</label>
        <div
          className="relative h-8 rounded"
          style={{
            background: `linear-gradient(to right, 
              hsl(${hue}, 0%, ${lightness}%), 
              hsl(${hue}, 100%, ${lightness}%))`,
          }}
        >
          <RangeSlider
            min={0}
            max={100}
            values={[saturation]}
            onChange={([s]) => onChange({ hue, saturation: s, lightness })}
            className="absolute inset-0"
            trackClassName="bg-transparent"
            rangeClassName="bg-transparent"
            formatter={(v) => `${v}%`}
          />
        </div>
      </div>

      {/* Lightness slider */}
      <div>
        <label className="text-sm font-medium mb-2 block">Lightness</label>
        <div
          className="relative h-8 rounded"
          style={{
            background: `linear-gradient(to right, 
              hsl(${hue}, ${saturation}%, 0%), 
              hsl(${hue}, ${saturation}%, 50%), 
              hsl(${hue}, ${saturation}%, 100%))`,
          }}
        >
          <RangeSlider
            min={0}
            max={100}
            values={[lightness]}
            onChange={([l]) => onChange({ hue, saturation, lightness: l })}
            className="absolute inset-0"
            trackClassName="bg-transparent"
            rangeClassName="bg-transparent"
            formatter={(v) => `${v}%`}
          />
        </div>
      </div>
    </div>
  );
}

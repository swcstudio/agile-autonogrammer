/**
 * SVG Test Component - Quick verification of SVGR integration
 */

import React from 'react';

import ArrowRight from '../../assets/icons/arrow-right.svg';
// Test direct SVG imports
import KatalystLogo from '../../assets/icons/katalyst-logo.svg';

// Test Icon component
import { Icon } from '../ui/Icon';

export function SVGTest() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">SVGR Integration Test</h2>

      <div className="space-y-2">
        <h3 className="font-semibold">Direct SVG Imports:</h3>
        <div className="flex items-center gap-4">
          <KatalystLogo className="w-8 h-8 text-blue-500" />
          <ArrowRight className="w-6 h-6 text-gray-600" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Icon Component System:</h3>
        <div className="flex items-center gap-4">
          <Icon name="katalyst-logo" size="lg" className="text-blue-500" />
          <Icon name="arrow-right" size="md" className="text-gray-600" />
          <Icon name="heart" size="sm" className="text-red-500" />
          <Icon name="star" size="sm" className="text-yellow-500" />
          <Icon name="check" size="sm" className="text-green-500" />
        </div>
      </div>

      <div className="text-sm text-gray-600">
        ✅ If you can see the icons above, SVGR integration is working correctly!
      </div>
    </div>
  );
}

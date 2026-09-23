import React from 'react';
import { ActiveColor } from '../types/uno';

interface PoolTableStageProps {
  activeColor: ActiveColor;
  children: React.ReactNode;
}

export const PoolTableStage: React.FC<PoolTableStageProps> = ({
  activeColor,
  children,
}) => {
  return (
    <div className={`billiards-room-viewport active-env-${activeColor}`}>
      {/* Deep Dark Green-Black Private Lounge Surroundings & Vignette */}
      <div className="room-ambient-backdrop" />
      <div className="room-overhead-lamp-fixture" aria-hidden="true">
        <div className="lamp-brass-shade" />
        <div className="lamp-volumetric-cone" />
      </div>

      {/* Elevated 3D Perspective Pool Table Container */}
      <div className="pool-table-3d-rig">
        {/* Outer Dark Walnut & Matte Black Table Frame (Rails + Pockets + Sights) */}
        <div className="pool-table-outer-cabinet">
          {/* Corner & Side Billiard Pockets */}
          <div className="table-pocket pocket-tl" />
          <div className="table-pocket pocket-tc" />
          <div className="table-pocket pocket-tr" />
          <div className="table-pocket pocket-bl" />
          <div className="table-pocket pocket-bc" />
          <div className="table-pocket pocket-br" />

          {/* Mother-of-Pearl / Gold Diamond Sights along the Wooden Rails */}
          <div className="rail-diamonds top-rail-diamonds" aria-hidden="true">
            <span /><span /><span /><span /><span /><span />
          </div>
          <div className="rail-diamonds left-rail-diamonds" aria-hidden="true">
            <span /><span /><span />
          </div>
          <div className="rail-diamonds right-rail-diamonds" aria-hidden="true">
            <span /><span /><span />
          </div>

          {/* Inner Beveled Cushion Nose */}
          <div className="pool-table-cushion-bevel">
            {/* Deep Dark Emerald Felt Playing Surface */}
            <div className="pool-table-felt-surface">
              {/* Subtle SVG Felt Weave Noise Texture */}
              <div className="felt-micro-texture" />

              {/* Overhead Spotlight Radial Illumination on Center Felt */}
              <div className="felt-overhead-spotlight" />

              {/* Cushion Inner Drop Shadow around the Perimeter */}
              <div className="felt-cushion-inner-shadow" />

              {/* Subtle Billiards Head-String & Center Felt Markings */}
              <div className="felt-baulk-line left-line" />
              <div className="felt-baulk-line right-line" />

              {/* Interactive Table Content (Opponents, Center Piles, Flights) */}
              <div className="pool-table-interactive-plane">{children}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Room Edge Vignette so the Center Table Remains the Unrivaled Focus */}
      <div className="room-screen-vignette" aria-hidden="true" />
    </div>
  );
};

import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as Cesium from 'cesium';
import { Zap, ArrowRight, MapPin, Rocket, ArrowLeft, Crosshair } from 'lucide-react';

const CESIUM_TOKEN = import.meta.env.VITE_CESIUM_TOKEN as string;
if (CESIUM_TOKEN) {
  Cesium.Ion.defaultAccessToken = CESIUM_TOKEN;
}

const STYLES = `
  @keyframes scanlineMove {
    0% { background-position: 0% 0%; }
    100% { background-position: 0% 200%; }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  #cesium-map-container .cesium-viewer-toolbar,
  #cesium-map-container .cesium-viewer-animationContainer,
  #cesium-map-container .cesium-viewer-timelineContainer,
  #cesium-map-container .cesium-viewer-bottom,
  #cesium-map-container .cesium-infoBox,
  #cesium-map-container .cesium-selection-wrapper,
  #cesium-map-container .cesium-geocoder-container,
  #cesium-map-container .cesium-viewer-geocoderContainer {
    display: none !important;
  }
  #cesium-map-container { background: #040914 !important; }
`;

async function nominatimSearch(query: string) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en&polygon_geojson=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'EcoSync-Hackathon', 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data?.length > 0) {
      const item = data[0];
      return {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: item.display_name,
        geojson: item.geojson?.type ? item.geojson : undefined,
      };
    }
  } catch (e) { console.error('Nominatim error:', e); }
  return null;
}

let boundarySource: Cesium.DataSource | null = null;
let pinEntity: Cesium.Entity | null = null;

export default function PostalMapView() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { coords: { lat: number; lng: number }; country: string } | null;

  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  const [searchQuery, setSearchQuery] = useState(state?.country ?? '');
  const [currentRegion, setCurrentRegion] = useState(() => ({
    name: state?.country ?? 'Global Network',
    fullDisplay: state?.country ? `${state?.country}` : 'Select a region to start',
    lat: state?.coords.lat ?? 20.0,
    lng: state?.coords.lng ?? 0.0,
  }));
  const [isLoading, setIsLoading] = useState(false);
  const [isSimReady, setIsSimReady] = useState(false);
  const [error, setError] = useState('');


  const updateMapPin = (viewer: Cesium.Viewer, lat: number, lng: number) => {
    if (pinEntity) { viewer.entities.remove(pinEntity); pinEntity = null; }
    pinEntity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lng, lat, 100),
      point: {
        pixelSize: 10,
        color: Cesium.Color.fromCssColorString('#00F5A0'),
        outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },

    });
  };

  const updateBoundary = async (viewer: Cesium.Viewer, lat: number, lng: number, geojson?: any) => {
    if (boundarySource) {
      viewer.dataSources.remove(boundarySource, true);
      boundarySource = null;
    }
    if (geojson && (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon')) {
      const featureCollection = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: geojson, properties: {} }] };
      try {
        const ds = await Cesium.GeoJsonDataSource.load(featureCollection, {
          stroke: Cesium.Color.fromCssColorString('#00F5A0').withAlpha(0.6) as any,
          strokeWidth: 3,
          fill: Cesium.Color.fromCssColorString('#00F5A0').withAlpha(0.04),
          clampToGround: true,
        });
        viewer.dataSources.add(ds);
        boundarySource = ds;
      } catch (e) { /* fallback below */ }
    }
    if (!boundarySource) {
      const circleEntity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
        ellipse: {
          semiMajorAxis: 1500, semiMinorAxis: 1500,
          material: Cesium.Color.fromCssColorString('#00F5A0').withAlpha(0.04),
          outline: true, outlineColor: Cesium.Color.fromCssColorString('#00F5A0').withAlpha(0.6),
          outlineWidth: 3, height: 0,
        },
      });
      boundarySource = { _entities: [circleEntity] } as any;
    }
  };

  useEffect(() => {
    if (!cesiumContainerRef.current || viewerRef.current) return;

    let viewer: Cesium.Viewer;

    const initViewer = async () => {
      try {
        let baseLayer: Cesium.ImageryLayer;
        try {
          const provider = await Cesium.IonImageryProvider.fromAssetId(2);
          baseLayer = new Cesium.ImageryLayer(provider);
        } catch {
          const provider = new Cesium.OpenStreetMapImageryProvider({ url: 'https://a.tile.openstreetmap.org/' });
          baseLayer = new Cesium.ImageryLayer(provider);
        }

        let terrainProvider: Cesium.TerrainProvider;
        try {
          terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
        } catch {
          terrainProvider = new Cesium.EllipsoidTerrainProvider();
        }

        viewer = new Cesium.Viewer(cesiumContainerRef.current!, {
          baseLayer,
          terrainProvider,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          shadows: false,
          shouldAnimate: true,
        });

        viewerRef.current = viewer;

        // Dark green satellite tint matching Screenshot 1
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0B1C15');
        viewer.scene.globe.enableLighting = true;
        // Apply tint
        viewer.scene.globe.atmosphereHueShift = 0.3; // Shifts towards deep green
        viewer.scene.globe.atmosphereSaturationShift = 0.2;
        viewer.scene.globe.atmosphereBrightnessShift = -0.4; // Darkens the imagery
        if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;

        try {
          const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(96188); // OSM Buildings
          viewer.scene.primitives.add(tileset);
          tileset.style = new Cesium.Cesium3DTileStyle({ color: "color('#1a2a22', 0.95)" });
        } catch { /* ignore */ }

        // Initial fly-in
        if (state?.coords) {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(currentRegion.lng, currentRegion.lat, 4000),
            orientation: { heading: 0, pitch: Cesium.Math.toRadians(-50), roll: 0 },
            duration: 3.0,
            easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
            complete: () => {
              updateMapPin(viewer, currentRegion.lat, currentRegion.lng);
              updateBoundary(viewer, currentRegion.lat, currentRegion.lng);
              setIsSimReady(true);
              
              if (state?.country) {
                 nominatimSearch(state.country).then((res) => {
                     if (res) setCurrentRegion(prev => ({ ...prev, fullDisplay: res.displayName }));
                 });
              }
            },
          });
        } else {
          // Start in Global View if no coords passed
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(0, 20, 25000000),
            orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
            duration: 2.0,
            easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
            complete: () => {
              setIsSimReady(false); // Must search a city to launch simulation
            }
          });
        }

      } catch (err) { console.error('Cesium map init failed:', err); }
    };

    initViewer();

    return () => {
      boundarySource = null;
      pinEntity = null;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) viewerRef.current.destroy();
      viewerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !viewerRef.current) return;
    setIsLoading(true);
    setError('');

    const query = searchQuery.trim();
    const result = await nominatimSearch(query);

    if (!result) {
      setError('Location not found.');
      setIsLoading(false);
      return;
    }

    const { lat, lng, displayName, geojson } = result;
    const shortName = query;

    setCurrentRegion({ name: shortName, fullDisplay: displayName, lat, lng });
    setIsSimReady(false);

    const viewer = viewerRef.current;
    
    // Zoom out first
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, 500000),
      duration: 2.0,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      complete: () => {
        // Zoom back in to city level
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lng, lat, 2000),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 },
          duration: 2.5,
          easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
          complete: () => {
            updateMapPin(viewer, lat, lng);
            updateBoundary(viewer, lat, lng, geojson);
            setIsLoading(false);
            setIsSimReady(true);
          },
        });
      },
    });
  }, [searchQuery]);

  const handleStartSimulation = useCallback(async () => {
    // Wake up / Trigger backend simulation before jumping to the dashboard
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/simulation/start`, { method: 'POST' });
    } catch (e) {
      console.warn('Simulation start trigger warning:', e);
    }
    
    navigate('/dashboard', {
      state: {
        coords: { lat: currentRegion.lat, lng: currentRegion.lng },
        regionName: currentRegion.name,
      },
    });
  }, [navigate, currentRegion]);

  return (
    <div className="fixed inset-0 bg-[#0B1C15] overflow-hidden">
      <style>{STYLES}</style>
      
      {/* ── CesiumJS Map Container ── */}
      <div id="cesium-map-container" ref={cesiumContainerRef} className="absolute inset-0" style={{ zIndex: 1, width: '100%', height: '100%' }} />

      {/* Grid overlay for aesthetic */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02] z-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(16,185,129,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.8) 1px, transparent 1px)',
          backgroundSize: '100px 100px',
        }}
      />

      {/* Error Toast */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/30 text-red-500 text-xs px-4 py-2 rounded-lg backdrop-blur shadow-lg">
          {error}
        </div>
      )}

      {/* ── Floating Controls Layer ── */}
      <div className="absolute top-8 left-8 right-8 z-50 flex justify-between pointer-events-none">
        
        {/* Left: Back Button */}
        <button
          onClick={() => navigate('/')}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B1526]/80 backdrop-blur-md border border-emerald-500/20 shadow-2xl text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Go Back</span>
        </button>

        {/* Right: Recenter Button */}
        <button
          onClick={() => {
            if (viewerRef.current) {
              viewerRef.current.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(0, 20, 25000000),
                orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
                duration: 2.0,
                easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
                complete: () => {
                   if (pinEntity) viewerRef.current!.entities.remove(pinEntity);
                   if (boundarySource) viewerRef.current!.dataSources.remove(boundarySource, true);
                   boundarySource = null;
                   pinEntity = null;
                   setSearchQuery('');
                   setCurrentRegion({ name: 'Global Network', fullDisplay: 'Select a region to start', lat: 20, lng: 0 });
                   setIsSimReady(false);
                }
              });
            }
          }}
          className="pointer-events-auto flex items-center justify-center w-11 h-11 rounded-xl bg-[#0B1526]/80 backdrop-blur-md border border-emerald-500/20 shadow-2xl text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group"
          title="Recenter Map"
        >
          <Crosshair className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
        </button>
      </div>

      {/* Top Center UI Widget - Exactly matching Screenshot 1 */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-[550px]">
        <div className="flex flex-col gap-2">
          {/* Box 1: Search */}
          <div className="p-2 rounded-2xl bg-[#0B1526]/80 backdrop-blur-md border border-emerald-500/20 shadow-2xl flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-5 h-5 text-[#040914] fill-current" />
            </div>
            
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search any area or pincode..."
              disabled={isLoading}
              className="flex-1 bg-[#142038]/50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-emerald-50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
            
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all text-sm font-medium border border-emerald-500/30"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              ) : (
                <>
                  <ArrowRight className="w-3.5 h-3.5" />
                  Find
                </>
              )}
            </button>
          </div>

          {/* Box 2: Location Details */}
          <div className="px-5 py-3 rounded-2xl bg-[#0B1526]/80 backdrop-blur-md border border-emerald-500/20 shadow-2xl flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[320px]">{currentRegion.fullDisplay}</span>
            </div>
            <div className="text-emerald-500/70 font-mono tracking-wider">
              {currentRegion.lat.toFixed(2)}&deg;, {currentRegion.lng.toFixed(2)}&deg;
            </div>
          </div>
          
          <div className="mt-1 text-center">
             <p className="text-[10px] text-slate-500 font-medium tracking-wide">
               Click a glowing city &middot; or type any location
             </p>
          </div>
        </div>
      </div>

      {/* Bottom Center UI Widget - Matching Screenshot 1 */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 text-center">
        <button
          onClick={handleStartSimulation}
          disabled={!isSimReady || isLoading}
          className={`group flex items-center gap-3 px-8 py-4 rounded-3xl font-bold text-sm transition-all duration-300 shadow-2xl ${
            (!isSimReady || isLoading)
              ? 'bg-[#142038]/80 text-emerald-500/50 cursor-not-allowed border border-emerald-500/20'
              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-400 hover:text-[#040914] border border-emerald-500/50 backdrop-blur-md shadow-emerald-500/10'
          }`}
        >
          {(!isSimReady || isLoading) ? (
            <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          ) : (
            <Rocket className="w-4 h-4 fill-current" />
          )}
          
          Launch EcoSync in {currentRegion.name}
        </button>
        
        <p className="mt-3 text-[10px] text-emerald-500/60 font-mono tracking-wides">
          {(!isSimReady || isLoading) 
            ? (isLoading ? 'Scanning region...' : 'Type a location above to deploy grid') 
            : 'Fetching real building data from OpenStreetMap...'}
        </p>
      </div>
    </div>
  );
}

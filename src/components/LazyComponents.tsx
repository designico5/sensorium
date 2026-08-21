/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, LazyExoticComponent, ComponentType } from 'react';
import { 
  Skeleton, 
  CardSkeleton, 
  ModalSkeleton,
  ChartSkeleton,
  DeviceCardSkeleton,
  TableSkeleton,
  ListSkeleton,
  FormSkeleton 
} from './Skeleton';

/**
 * Higher-order component for lazy loading with skeleton fallback
 * Provides consistent loading states across all lazy-loaded components
 */
export function withLazyLoading<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  skeletonType: 'card' | 'modal' | 'chart' | 'device' | 'table' | 'list' | 'form' = 'card'
): LazyExoticComponent<T> {
  const LazyComponent = lazy(importFn);
  
  const SkeletonFallback = () => {
    switch (skeletonType) {
      case 'modal':
        return <ModalSkeleton />;
      case 'chart':
        return <ChartSkeleton />;
      case 'device':
        return <DeviceCardSkeleton />;
      case 'table':
        return <TableSkeleton />;
      case 'list':
        return <ListSkeleton />;
      case 'form':
        return <FormSkeleton />;
      case 'card':
      default:
        return <CardSkeleton />;
    }
  };

  const WithSuspense: React.FC<React.ComponentProps<T>> = (props) => (
    <Suspense fallback={<SkeletonFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  WithSuspense.displayName = `Lazy(${LazyComponent.displayName || 'Component'})`;
  
  return WithSuspense as unknown as LazyExoticComponent<T>;
}

// Pre-configured lazy components for heavy modals/views
// Note: All components use default exports, so we use module.default
export const LazyVintageDeviceLibraryModal = withLazyLoading(
  () => import('./VintageDeviceLibraryModal').then(module => ({ default: module.default })),
  'modal'
);

export const LazyCustomDashboardStudio = withLazyLoading(
  () => import('./CustomDashboardStudio').then(module => ({ default: module.default })),
  'modal'
);

export const LazyAuraStudioCoach = withLazyLoading(
  () => import('./AuraStudioCoach').then(module => ({ default: module.default })),
  'card'
);

export const LazyDAWProductionHub = withLazyLoading(
  () => import('./DAWProductionHub').then(module => ({ default: module.default })),
  'card'
);

export const LazyEnsembleVisualizer = withLazyLoading(
  () => import('./EnsembleVisualizer').then(module => ({ default: module.default })),
  'chart'
);

export const LazyPressKitView = withLazyLoading(
  () => import('./PressKitView').then(module => ({ default: module.default })),
  'card'
);

export const LazyUnifiedSystemTopologyMap = withLazyLoading(
  () => import('./UnifiedSystemTopologyMap').then(module => ({ default: module.default })),
  'chart'
);

export const LazyQuantumInstinctMatrix = withLazyLoading(
  () => import('./QuantumInstinctMatrix').then(module => ({ default: module.default })),
  'chart'
);

export const LazySpatial3DClusterView = withLazyLoading(
  () => import('./Spatial3DClusterView').then(module => ({ default: module.default })),
  'chart'
);

export const LazyArrangementGeniusAI = withLazyLoading(
  () => import('./ArrangementGeniusAI').then(module => ({ default: module.default })),
  'card'
);

export const LazySnapshotMorphSuite = withLazyLoading(
  () => import('./SnapshotMorphSuite').then(module => ({ default: module.default })),
  'card'
);

export const LazyRemoteSyncPortal = withLazyLoading(
  () => import('./RemoteSyncPortal').then(module => ({ default: module.default })),
  'card'
);

export const LazyAudiophileAcousticLab = withLazyLoading(
  () => import('./AudiophileAcousticLab').then(module => ({ default: module.default })),
  'chart'
);

export const LazySpatial5DStadiumEngine = withLazyLoading(
  () => import('./Spatial5DStadiumEngine').then(module => ({ default: module.default })),
  'chart'
);

export const LazyTripleAuditHardeningSuite = withLazyLoading(
  () => import('./TripleAuditHardeningSuite').then(module => ({ default: module.default })),
  'card'
);

export const LazyHardwareBlueprintView = withLazyLoading(
  () => import('./HardwareBlueprintView').then(module => ({ default: module.default })),
  'chart'
);

export const LazyMidiMappingView = withLazyLoading(
  () => import('./MidiMappingView').then(module => ({ default: module.default })),
  'chart'
);

export const LazyTriggerUsbView = withLazyLoading(
  () => import('./TriggerUsbView').then(module => ({ default: module.default })),
  'card'
);

export const LazyActivityLoggerView = withLazyLoading(
  () => import('./ActivityLoggerView').then(module => ({ default: module.default })),
  'list'
);

export const LazyMultiChannelRecorderView = withLazyLoading(
  () => import('./MultiChannelRecorderView').then(module => ({ default: module.default })),
  'card'
);

export const LazySetupGuide = withLazyLoading(
  () => import('./SetupGuide').then(module => ({ default: module.default })),
  'card'
);

export const LazySimulatorPanel = withLazyLoading(
  () => import('./SimulatorPanel').then(module => ({ default: module.default })),
  'card'
);

export const LazyCodeViewer = withLazyLoading(
  () => import('./CodeViewer').then(module => ({ default: module.default })),
  'card'
);

export const LazyLatencyChart = withLazyLoading(
  () => import('./LatencyChart').then(module => ({ default: module.default })),
  'chart'
);

export const LazyMindmap = withLazyLoading(
  () => import('./Mindmap').then(module => ({ default: module.default })),
  'chart'
);

export const LazyIsometricDevice = withLazyLoading(
  () => import('./IsometricDevice').then(module => ({ default: module.default })),
  'chart'
);

export const LazyDiagnosticCard = withLazyLoading(
  () => import('./DiagnosticCard').then(module => ({ default: module.default })),
  'device'
);

export const LazyVolumetricFrequencyCloudBg = withLazyLoading(
  () => import('./VolumetricFrequencyCloudBg').then(module => ({ default: module.default })),
  'chart'
);

// Re-export Skeleton components for direct usage
export { 
  Skeleton, 
  CardSkeleton, 
  DeviceCardSkeleton, 
  ChartSkeleton, 
  TableSkeleton, 
  ListSkeleton, 
  FormSkeleton, 
  ModalSkeleton 
} from './Skeleton';

export default withLazyLoading;
/**
 * App shell with router, top bar, bottom bar, left/right drawer shells.
 * Follows the layout from docs/UI/app-structure.md.
 */

import { useState, useEffect, useCallback } from 'react';
import type { AppState } from '@/types';
import { getHashPath, matchRoute, onRouteChange, isWorkflowRoute, getTabFromPath } from '@/lib/router';
import { getState, subscribe, setActiveTab, closeAllOverlays } from '@/store/app-state';
import { TopBar } from '@/components/shell/TopBar';
import { BottomBar } from '@/components/shell/BottomBar';
import { LeftDrawer } from '@/components/shell/LeftDrawer';
import { RightDrawer } from '@/components/shell/RightDrawer';
import { EdgeHandle } from '@/components/shell/EdgeHandle';
import { Home } from '@/pages/Home';
import { Workflow } from '@/pages/Workflow';

export function App() {
  const [appState, setAppState] = useState<AppState>(getState());
  const [currentPath, setCurrentPath] = useState(getHashPath());

  // Subscribe to store changes
  useEffect(() => {
    return subscribe((s) => setAppState(s));
  }, []);

  // Subscribe to route changes
  useEffect(() => {
    const unsubscribe = onRouteChange((route) => {
      setCurrentPath(route.path);
      setActiveTab(getTabFromPath(route.path));
      closeAllOverlays();
    });

    // Set initial tab from hash
    const initial = getHashPath();
    setCurrentPath(initial);
    setActiveTab(getTabFromPath(initial));

    return unsubscribe;
  }, []);

  // Determine which page to render
  const isWorkflow = isWorkflowRoute(currentPath);
  const routeMatch = matchRoute(currentPath);

  const handleBackdropClick = useCallback(() => {
    closeAllOverlays();
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh',
      position: 'relative',
      background: 'var(--bg)',
    }}>
      {/* Top Bar */}
      <TopBar
        breadcrumb={appState.breadcrumb}
        glassesConnected={appState.glassesConnected}
        bridgeConnected={appState.bridgeConnected}
        agentStatus={appState.agentStatus}
      />

      {/* Main Content */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        paddingBottom: '60px',
        paddingTop: '4px',
      }}>
        {isWorkflow ? (
          <Workflow workflowId={routeMatch.params.workflowId} activeTab={appState.activeTab} />
        ) : (
          <Home activeTab={appState.activeTab} />
        )}
      </main>

      {/* Edge Handles */}
      <EdgeHandle side="left" />
      <EdgeHandle side="right" />

      {/* Bottom Bar */}
      <BottomBar
        mode={appState.bottomBarMode}
        activeTab={appState.activeTab}
        workflowId={routeMatch.params.workflowId}
      />

      {/* Left Drawer */}
      {appState.leftDrawerOpen && (
        <>
          <div className="drawer-backdrop" onClick={handleBackdropClick} />
          <LeftDrawer />
        </>
      )}

      {/* Right Drawer */}
      {appState.rightDrawerOpen && (
        <>
          <div className="drawer-backdrop" onClick={handleBackdropClick} />
          <RightDrawer />
        </>
      )}
    </div>
  );
}

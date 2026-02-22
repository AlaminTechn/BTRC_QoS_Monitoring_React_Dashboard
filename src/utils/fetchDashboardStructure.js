/**
 * Utility to fetch Regulatory Dashboard structure from Metabase
 * Run this to get all card IDs and their configuration
 */

import metabaseAPI from '../api/metabase';

const REGULATORY_DASHBOARD_ID = 6;

async function fetchDashboardStructure() {
  try {
    // Login
    console.log('Logging in to Metabase...');
    await metabaseAPI.login(
      'alamin.technometrics22@gmail.com',
      'Test@123'
    );

    // Get dashboard structure
    console.log('Fetching dashboard structure...');
    const dashboard = await metabaseAPI.getDashboard(REGULATORY_DASHBOARD_ID);

    console.log('\n=== REGULATORY DASHBOARD STRUCTURE ===\n');
    console.log('Dashboard ID:', dashboard.id);
    console.log('Dashboard Name:', dashboard.name);
    console.log('Total Cards:', dashboard.dashcards?.length || 0);

    // Group cards by tab
    const cardsByTab = {};

    dashboard.dashcards?.forEach((dashcard) => {
      const tabName = dashcard.dashboard_tab_id
        ? dashboard.tabs?.find(t => t.id === dashcard.dashboard_tab_id)?.name || 'Default'
        : 'Default';

      if (!cardsByTab[tabName]) {
        cardsByTab[tabName] = [];
      }

      cardsByTab[tabName].push({
        dashcard_id: dashcard.id,
        card_id: dashcard.card_id,
        card_name: dashcard.card?.name || 'Unknown',
        visualization_type: dashcard.card?.display || 'unknown',
        size: {
          col: dashcard.col,
          row: dashcard.row,
          size_x: dashcard.size_x,
          size_y: dashcard.size_y,
        },
      });
    });

    // Print cards organized by tab
    Object.entries(cardsByTab).forEach(([tabName, cards]) => {
      console.log(`\n--- Tab: ${tabName} ---`);
      cards.forEach((card, index) => {
        console.log(`${index + 1}. Card ID: ${card.card_id} | DashCard ID: ${card.dashcard_id}`);
        console.log(`   Name: ${card.card_name}`);
        console.log(`   Type: ${card.visualization_type}`);
        console.log(`   Position: col=${card.size.col}, row=${card.size.row}, size=${card.size.size_x}x${card.size.size_y}`);
      });
    });

    // Export card configuration
    const cardConfig = {};
    dashboard.dashcards?.forEach((dashcard) => {
      const tabName = dashcard.dashboard_tab_id
        ? dashboard.tabs?.find(t => t.id === dashcard.dashboard_tab_id)?.name || 'Default'
        : 'Default';

      cardConfig[dashcard.card_id] = {
        id: dashcard.card_id,
        dashcard_id: dashcard.id,
        name: dashcard.card?.name || 'Unknown',
        display: dashcard.card?.display || 'unknown',
        tab: tabName,
        description: dashcard.card?.description || '',
      };
    });

    console.log('\n\n=== CARD CONFIGURATION (Copy this to cardConfig.js) ===\n');
    console.log(JSON.stringify(cardConfig, null, 2));

    return { dashboard, cardConfig };
  } catch (error) {
    console.error('Error fetching dashboard structure:', error);
    throw error;
  }
}

// Run if executed directly
if (typeof window !== 'undefined') {
  window.fetchDashboardStructure = fetchDashboardStructure;
  console.log('Run: window.fetchDashboardStructure()');
}

export default fetchDashboardStructure;

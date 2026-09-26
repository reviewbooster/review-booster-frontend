'use strict';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

/**
 * context/ProductFeaturesContext.js
 * Tracks which spotlight deep dives and info popups this BUSINESS has
 * already seen -- server-side (via Business.product_features_seen), not
 * localStorage -- so each one shows exactly once per account, regardless
 * of which device or browser it's opened from. Keys are namespaced by
 * caller so the two systems can never collide: 'dive_<key>' for
 * SpotlightTour deep dives, 'info_<key>' for InfoButton auto-shows.
 */
const ProductFeaturesContext = createContext({
  seenKeys: [],
  loaded: false,
  markSeen: function() {},
});

export function ProductFeaturesProvider({ children }) {
  const { user } = useAuth();
  const [seenKeys, setSeenKeys] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const seenKeysRef = useRef([]);

  useEffect(function() {
    if (!user) return;
    api.get('/business/my-settings')
      .then(function(res) {
        var keys = (res.data && res.data.data && res.data.data.product_features_seen) || [];
        seenKeysRef.current = keys;
        setSeenKeys(keys);
      })
      .catch(function() {
        // Fall back to "nothing seen yet" rather than blocking the dashboard --
        // worst case a dive shows once more than it strictly needed to.
      })
      .finally(function() { setLoaded(true); });
  }, [user]);

  var markSeen = useCallback(function(key) {
    if (seenKeysRef.current.indexOf(key) !== -1) return;
    seenKeysRef.current = seenKeysRef.current.concat([key]);
    setSeenKeys(seenKeysRef.current);
    api.patch('/business/my-settings/feature-seen', { key }).catch(function() {
      // Best-effort -- a missed write just means one extra viewing later.
    });
  }, []);

  return (
    <ProductFeaturesContext.Provider value={{ seenKeys: seenKeys, loaded: loaded, markSeen: markSeen }}>
      {children}
    </ProductFeaturesContext.Provider>
  );
}

export function useProductFeatures() {
  return useContext(ProductFeaturesContext);
}
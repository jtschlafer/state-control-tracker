# 2026 state government control tracker

Who controls each state's governorship, House and Senate after the Nov. 3, 2026 election, with trifectas, veto-proof supermajorities and net seat shifts. Results are unofficial and compiled from AP and network projections and state news outlets.

**Open the tracker:** https://jtschlafer.github.io/state-control-tracker/

The page works in any browser with no login. You can filter (all states, any change, all trifectas, new trifectas, trifectas lost, trifecta + supermajority, not yet called), cycle party (both / Rep / Dem), search, sort any column, hide the SuperMaj or Shift columns, and export the current view to Excel.

## Files

- `index.html` — the published page (built; one self-contained file)
- `data/state_control_2026.json` — one row per state
- `src/page.html`, `src/xl.js` — page source and the Excel export
- `tools/build.py` — rebuilds `index.html` from `src/` and `data/`: `python3 tools/build.py`

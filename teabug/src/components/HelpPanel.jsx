export default function HelpPanel() {
  return (
    <div className="panel help-panel">
      <div className="panel-header">
        <h2 className="panel-title">📖 How to Play Teabug</h2>
        <p className="panel-subtitle">A guide to running your very own country tea room</p>
      </div>

      <div className="help-sections">

        <div className="help-section">
          <h3 className="help-section-title">☕ The Game Loop</h3>
          <div className="help-card">
            <ol className="help-steps">
              <li>
                <span className="step-icon">🛒</span>
                <div>
                  <strong>Order ingredients</strong> — Visit <em>Order Supplies</em> to stock your pantry. Buy in bulk (10+ or 20+ units) for discounts. You start with $200.
                </div>
              </li>
              <li>
                <span className="step-icon">🍳</span>
                <div>
                  <strong>Prep menu items</strong> — Go to <em>Menu &amp; Prep</em> and press <strong>Prep Batch</strong> on any item. Each batch preps 6 servings and consumes the listed ingredients from your pantry.
                </div>
              </li>
              <li>
                <span className="step-icon">💰</span>
                <div>
                  <strong>Set your prices</strong> — Still on the Menu page, edit the price for each item. The ingredient cost and profit margin are shown — aim for a healthy markup!
                </div>
              </li>
              <li>
                <span className="step-icon">🌅</span>
                <div>
                  <strong>Open for the day</strong> — Press <strong>"Open for the Day"</strong> in the top bar. The game clock starts at 8:00 AM and runs to 8:00 PM over ~10 real minutes.
                </div>
              </li>
              <li>
                <span className="step-icon">👥</span>
                <div>
                  <strong>Serve customers</strong> — Guests walk in automatically, find a table, and order from whatever is stocked. Service is automatic — your job is keeping the shelves filled and prices right.
                </div>
              </li>
              <li>
                <span className="step-icon">🌄</span>
                <div>
                  <strong>End of day</strong> — At 8 PM the shop closes. Review your revenue in the <em>Order Supplies</em> sales log, then press <strong>"Start New Day"</strong> to do it again. Your money and inventory carry over.
                </div>
              </li>
            </ol>
          </div>
        </div>

        <div className="help-section">
          <h3 className="help-section-title">🕐 Time of Day &amp; Customer Preferences</h3>
          <div className="help-card">
            <p className="help-intro">Customers' tastes shift throughout the day. Keep the right items stocked at the right time!</p>
            <div className="time-pref-table">
              <div className="time-pref-row header">
                <span>Period</span><span>Time</span><span>Favoured Items</span>
              </div>
              <div className="time-pref-row">
                <span>🌅 Morning</span>
                <span>8 – 10 AM</span>
                <span>Hot teas, scones, muffins</span>
              </div>
              <div className="time-pref-row">
                <span>🌤 Late Morning</span>
                <span>10 AM – 12 PM</span>
                <span>Specialty teas, light pastries</span>
              </div>
              <div className="time-pref-row alt">
                <span>☀️ Midday</span>
                <span>12 – 2 PM</span>
                <span>Iced tea, cookies — <em>busiest rush!</em></span>
              </div>
              <div className="time-pref-row">
                <span>🍵 Afternoon</span>
                <span>2 – 5 PM</span>
                <span>Chai, sweets, herbal teas</span>
              </div>
              <div className="time-pref-row alt">
                <span>🌙 Evening</span>
                <span>5 – 8 PM</span>
                <span>Herbal brew, scones, hot teas</span>
              </div>
            </div>
          </div>
        </div>

        <div className="help-section">
          <h3 className="help-section-title">😊 Customer Moods</h3>
          <div className="help-card help-moods">
            <div className="mood-item">
              <span className="mood-dot" style={{ background: '#ffffff', border: '2px solid #888' }} />
              <div><strong>Neutral</strong> — Just arrived, patiently waiting to order.</div>
            </div>
            <div className="mood-item">
              <span className="mood-dot" style={{ background: '#ff9a3c' }} />
              <div><strong>Impatient</strong> — Running low on patience. Serve them soon or they'll leave!</div>
            </div>
            <div className="mood-item">
              <span className="mood-dot" style={{ background: '#ff6b6b' }} />
              <div><strong>Unhappy</strong> — Left without being served, or their item was out of stock.</div>
            </div>
            <div className="mood-item">
              <span className="mood-dot" style={{ background: '#ffdd57' }} />
              <div><strong>Happy</strong> — Successfully served! They'll linger a moment then head out.</div>
            </div>
          </div>
        </div>

        <div className="help-section">
          <h3 className="help-section-title">💡 Tips &amp; Strategy</h3>
          <div className="help-card">
            <ul className="help-tips">
              <li>
                <span className="tip-icon">📦</span>
                Watch the <strong>Inventory</strong> tab for low-stock warnings (the tab shows a red badge when something needs restocking).
              </li>
              <li>
                <span className="tip-icon">🍪</span>
                <strong>Shortbread Cookies</strong> are cheap to make and sell well all afternoon — great for steady cash flow.
              </li>
              <li>
                <span className="tip-icon">🫖</span>
                The <strong>Cream Tea Set</strong> has the highest sale price but uses many ingredients. Prep it only when stocked up.
              </li>
              <li>
                <span className="tip-icon">⚠️</span>
                If an item is <strong>out of stock</strong> when a customer wants it, they leave unhappy. Keep at least a small buffer of each popular item.
              </li>
              <li>
                <span className="tip-icon">📈</span>
                You can <strong>pause the day</strong> at any time to prep more batches or place supply orders — the clock stops while paused.
              </li>
              <li>
                <span className="tip-icon">🎯</span>
                Price too high and customers may order something cheaper instead. Price too low and you'll erode your margins — the menu shows your % markup to help.
              </li>
              <li>
                <span className="tip-icon">💾</span>
                Progress is <strong>saved automatically</strong> in your browser. Your money, inventory, and menu settings carry over between sessions.
              </li>
            </ul>
          </div>
        </div>

        <div className="help-section">
          <h3 className="help-section-title">🗺 Reading the Café View</h3>
          <div className="help-card">
            <ul className="help-tips">
              <li><span className="tip-icon">🟤</span> <strong>Circles</strong> on the canvas are customers — their initials are shown inside, their colour is unique to them.</li>
              <li><span className="tip-icon">💬</span> A <strong>speech bubble</strong> above a customer shows what they ordered and are waiting for.</li>
              <li><span className="tip-icon">😤</span> The <strong>coloured ring</strong> around a customer shows their mood — white is neutral, orange is impatient, yellow is happy.</li>
              <li><span className="tip-icon">🪑</span> Customers walk to a <strong>table</strong>, sit, order, get served, then leave through the <strong>door</strong> at the bottom.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  )
}

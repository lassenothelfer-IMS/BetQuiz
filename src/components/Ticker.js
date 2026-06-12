'use client';

// Broadcast crawl along the bottom of the screen — scrolls live events so you
// always feel the other players moving. Items are short uppercase strings.
export default function Ticker({ items }) {
  const list = items && items.length ? items : ['BetQuiz — place your bets', 'read the question · work the odds · bet your bankroll'];
  const row = list.join('   ◆   ');

  return (
    <div className="ticker w-full">
      <div className="ticker-track">
        <span className="px-3 text-ash">{row}&nbsp;&nbsp;&nbsp;◆&nbsp;&nbsp;&nbsp;</span>
        <span className="px-3 text-ash" aria-hidden>
          {row}&nbsp;&nbsp;&nbsp;◆&nbsp;&nbsp;&nbsp;
        </span>
      </div>
    </div>
  );
}

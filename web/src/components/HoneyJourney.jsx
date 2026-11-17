// "From flower to jar" — a cinematic photo film, like a nature documentary.
// Real macro close-ups crossfade with a slow Ken Burns zoom while the 5 steps
// light up in turn. The bee flies across the film and rests by the hive.
import { useEffect, useState } from 'react';
import Bee from './Bee';

const PX = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;

const STEPS = [
  { n: 1, title: 'Nectar from the flower', text: 'The bee sits on a blossom and sips sweet nectar.', photo: PX(1101191), alt: 'Close-up of a honeybee covered in pollen on a yellow flower' },
  { n: 2, title: 'Flying home', text: 'Wings buzzing, she carries the nectar back to the hive.', photo: PX(9760179), alt: 'A bee in flight above white flowers' },
  { n: 3, title: 'Into the hive', text: 'She returns to her home — the beehive.', photo: PX(13086555), alt: 'Bees flying at the entrance of a beehive' },
  { n: 4, title: 'Honey in the comb', text: 'Nectar ripens into golden honey inside the wax comb.', photo: PX(3213004), alt: 'A honeycomb frame full of bees' },
  { n: 5, title: 'Pure honey in the jar', text: 'Raw, unprocessed honey, packed fresh for you.', photo: PX(8805023), alt: 'Golden honey dripping from a wooden dipper into a glass jar' },
];

export default function HoneyJourney() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 4000);
    return () => clearInterval(t);
  }, []);
  const s = STEPS[active];
  return (
    <div className="section reveal">
      <h2>From flower to jar — how our honey is made</h2>
      <p className="sub">Real close-ups, like in a nature film — watch one bee make your honey.</p>
      <div className="journey panel">
        <div className="journey-stage">
          {STEPS.map((st, i) => (
            <img key={st.n} src={st.photo} alt={st.alt} loading={i === 0 ? 'eager' : 'lazy'}
              className={'journey-photo' + (i === active ? ' on' : '') + (i % 2 ? ' alt' : '')} />
          ))}
          <div className="journey-scrim" />
          <Bee cls="journey-bee" width={92} height={62} />
          <div className="journey-caption">
            <b>{s.n}. {s.title}</b>
            <span>{s.text}</span>
          </div>
          <div className="journey-progress">
            {STEPS.map((st, i) => (
              <button key={st.n} className={'journey-dot' + (i === active ? ' on' : '')} aria-label={st.title} onClick={() => setActive(i)} />
            ))}
          </div>
        </div>
        <div className="journey-steps">
          {STEPS.map((st, i) => (
            <button key={st.n} className={'journey-step' + (i === active ? ' lit' : '')} onClick={() => setActive(i)}>
              <span className="journey-num">{st.n}</span>
              <img className="journey-thumb" src={st.photo} alt="" />
              <b>{st.title}</b>
              <span>{st.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

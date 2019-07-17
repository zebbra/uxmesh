
usage:

```
npm install
DEBUG=* node server.js
node client.js
```

open browser http://localhost:3000

remember to change the addr where socker.io connects to, currently static to:

`const socket = io.connect('http://127.0.0.1:3000')`

other stuff:
chrome://webrtc-internals/
https://github.com/feross/simple-peer (see perf dir for simple perfomance test example)
https://d3js.org/
https://gist.github.com/d9bf021c395835427aa0.git

Possible animations to vizualize the data:
https://jaumereg.github.io/d3-viz-animated-chord-diagram/
https://guyabel.com/post/animated-directional-chord-diagrams/

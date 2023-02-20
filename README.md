# Cosa c'entra

A small node script that I wrote this evening, will probably never touch again but was quite fun to do.

## Results

This is here only for the .html page to fill

## What

A small script that uses wikipedia API to find a connection between two random pages (I'm pretty sure that several similar projects already exist, but the first one I found did not work with wikipedia.it and I really wanted to write this from scratch)

## Why

Boredom, of course, but here's the explanation that makes me feel better:

A week ago a new daily podcast from Il Post has begun: ["Cosa c'entra"](https://www.ilpost.it/episodes/podcasts/cosa-c-entra/), from Chiara Alessi.

While it's really interesting, and I listen to it every day, I must confess that I find it quite lacking in efficiency.

Every episode explains how two apparently random items are actually connected, and takes around 7 minutes.

That's great, but are the connections that Chiara Alessi finds the best ones? Let's find out!

## How

A rate limited (200 req/s) fetcher from wikipedia API that looks for the goal page starting from the start page.

## Who

I wrote this abomination, but I really would like to thank Chiara Alessi for her amazing work with the podcast. Still, after 6 episodes, she could really be more efficient.

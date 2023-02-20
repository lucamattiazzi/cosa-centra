const { writeFileSync } = require('fs')

const BASE_LINKS_URL = "https://it.wikipedia.org/w/api.php?action=query&format=json&generator=links&gpllimit=500&inprop=url&prop=info&redirects=&titles="
const MAX_DEPTH = 4
const MAX_RETRIES = 4
const INTERVAL = 1000
const RATE_LIMIT = 200 // wikipedia will get angry if I go over 200 req/s
const times = []
const fails = []

const linksCache = new Map()

async function tryFetchLinks(url, retry = 0) {
  try {
    const response = await fetch(url)
    const results = await response.json()
    const links = Object.values(results.query.pages)
    return links
  } catch (err) {
    if (retry > MAX_RETRIES) {
      fails.push(url)
      return []
    }
    await new Promise((r) => setTimeout(r, 100 + 100 * retry))
    return tryFetchLinks(url, retry + 1)
  }
}

function createLimitedFetchLinks() {
  const backlog = []
  let ranInThisInterval = []

  async function loop() {
    const startLoop = Date.now()
    ranInThisInterval = ranInThisInterval.filter(d => d > startLoop - INTERVAL)
    while (backlog.length && RATE_LIMIT - ranInThisInterval.length > 0) {
      const startTime = Date.now()
      const request = backlog.shift()
      ranInThisInterval.push(startTime)
      request().then(r => {
        const elapsed = Date.now() - startTime
        times[times.length - 1].push(elapsed)
      })
    }
    const nextLoopDelay = Date.now() - startLoop + INTERVAL
    setTimeout(() => loop(), nextLoopDelay)
  }

  loop()

  return async function (url) {
    return new Promise((resolve) => {
      const handler = async () => {
        const results = await tryFetchLinks(url)
        resolve(results)
      }
      backlog.push(handler)
    })
  }
}

const fetcher = createLimitedFetchLinks()

function filterLinks(link) {
  if (!link.pageid) return false
  if (!isNaN(Number(link.title))) return false
  return true
}

async function getLinks(title) {
  if (linksCache.has(title)) return linksCache.get(title)
  try {
    const links = await fetcher(`${BASE_LINKS_URL}${title}`)
    const validLinks = links.filter(filterLinks)
    const titles = validLinks.map(l => l.title)
    linksCache.set(title, titles)
    return titles
  } catch (err) {
    return []
  }
}

function findPath(w1, w2) {
  const firstBacklog = [[w1]]
  const finalGoal = w2.toLowerCase()
  async function loop(backlog, goal) {
    const expectedDuration = Math.round(backlog.length / RATE_LIMIT)
    console.log(`Running ${backlog.length} requests, will take ~ ${expectedDuration}s`)
    times.push([])
    const length = backlog[0].length
    if (length > MAX_DEPTH) throw new Error(JSON.stringify({ error: "Could not solve" }))
    const newPathsPromises = backlog.map(async path => {
      const title = path.slice(-1)[0]
      const links = await getLinks(title)
      const succesfulPaths = links.filter(l => l.toLowerCase() === goal).map(s => [...path, s])
      if (succesfulPaths.length) throw new Error(JSON.stringify(succesfulPaths))
      const newPaths = links.map(l => [...path, l])
      return newPaths
    })
    const newPaths = await Promise.all(newPathsPromises)
    const flattened = newPaths.flat()
    return loop(flattened, goal)
  }
  return loop(firstBacklog, finalGoal)
}

function main() {
  const [episode, from, to] = process.argv.slice(3)
  const filename = `${from.replace(/ /g, "_")}-${to.replace(/ /g, "_")}`
  findPath(from, to).catch((err) => {
    const data = JSON.parse(err.message)
    const results = {
      episode,
      results: data.error ? data : data[0]
    }
    const parsedTimes = times.map((values, idx) => {
      const avg = Math.round((values.reduce((a, v) => a + v, 0) / values.length))
      const max = Math.max(...values)
      const min = Math.min(...values)
      return { depth: idx, avg, max, min }
    })
    writeFileSync(`./logs/fails-${filename}.json`, JSON.stringify(fails, null, 2))
    writeFileSync(`./logs/times-${filename}.json`, JSON.stringify(parsedTimes, null, 2))
    writeFileSync(`./results/result-${filename}.json`, JSON.stringify(results, null, 2))
  })
}

main()

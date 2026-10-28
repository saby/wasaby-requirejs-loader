const rootDomain = `//${location.host}`;

export default function isCrossOriginUrl(url: string) {
    return !url.includes(rootDomain);
}

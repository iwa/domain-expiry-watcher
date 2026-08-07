package utils

import (
	"bufio"
	"fmt"
	"net"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/iwa/Expira/internal/state"
)

// UpdateDomains queries WHOIS servers for all domains in the store and updates their expiry dates.
// This function is thread-safe and can be called concurrently with other store operations.
func UpdateDomains(store *state.DomainStore) {
	println("[INFO] Updating domains...")

	var wg sync.WaitGroup

	// Get all domains from the store
	domains := store.GetAllDomains()

	for domain, domainData := range domains {
		wg.Add(1)
		go updateDomainExpiry(store, domain, domainData, &wg)
	}

	wg.Wait()
	store.MarkRefreshed()
	println("[INFO] All domains updated.")
}

func updateDomainExpiry(store *state.DomainStore, domain string, domainData state.Domain, wg *sync.WaitGroup) {
	defer wg.Done()

	res, err := getDomainExpiry(domain)
	if err != nil {
		fmt.Printf("[ERROR] Failed to update expiry date for domain %s: %v\n", domain, err)
		return
	}

	if res.IsZero() {
		fmt.Printf("[WARN] No expiry date found for domain %s.\n", domain)
		return
	}

	if domainData.Status == state.StatusActive && res.Before(domainData.ExpiryDate) {
		fmt.Printf("[WARN] Expiry date fetched is earlier than currently saved date, this is likely due to an error when fetching date from WHOIS. Skipping %s...\n", domain)
		return
	}

	domainData.ExpiryDate = res
	domainData.Status = state.StatusActive
	store.SetDomain(domain, domainData)

	println("[INFO] Domain:", domain, "- Expiry date:", res.Format("2006-01-02 15:04:05"))
}

func getDomainExpiry(domain string) (time.Time, error) {
	// 1. Query IANA for the TLD info
	ianaResp, err := whoisQuery(domain, "whois.iana.org")
	if err != nil {
		return time.Time{}, fmt.Errorf("error contacting whois.iana.org: %w", err)
	}

	// 2. Parse the TLD WHOIS server from the IANA response
	server, found := parseWhoisServer(ianaResp)
	if !found {
		fmt.Println("[ERROR] Could not find specific WHOIS server in IANA response in:")
		fmt.Print(ianaResp)
		return time.Time{}, fmt.Errorf("could not find specific WHOIS server in IANA response")
	}

	// 3. Query the TLD WHOIS server for detailed info
	fullResp, err := whoisQuery(domain, server)
	if err != nil {
		return time.Time{}, fmt.Errorf("error contacting %s: %w", server, err)
	}

	// 4. Extract the expiry date from the WHOIS response
	expiryDate, found := getExpiryDate(fullResp)
	if !found {
		return time.Time{}, fmt.Errorf("could not find expiry date in WHOIS response")
	}

	// 5. Parse the expiry date
	date, err := time.Parse(time.RFC3339, expiryDate)
	if err != nil {
		return time.Time{}, fmt.Errorf("error parsing expiry date %s: %w", expiryDate, err)
	}

	return date, nil
}

func whoisQuery(domain, server string) (string, error) {
	if server == "" || domain == "" {
		return "", fmt.Errorf("invalid server or query")
	}

	conn, err := net.DialTimeout("tcp", server+":43", 10*time.Second)
	if err != nil {
		return "", err
	}
	defer conn.Close()

	fmt.Fprintf(conn, "%s\r\n", domain)

	var response strings.Builder
	scanner := bufio.NewScanner(conn)
	for scanner.Scan() {
		response.WriteString(scanner.Text() + "\n")
	}

	if err := scanner.Err(); err != nil {
		return "", err
	}
	return response.String(), nil
}

func parseWhoisServer(ianaResponse string) (string, bool) {
	re := regexp.MustCompile(`(?i)^whois:\s*([^\s]+)`)
	scanner := bufio.NewScanner(strings.NewReader(ianaResponse))

	for scanner.Scan() {
		line := scanner.Text()
		if matches := re.FindStringSubmatch(line); matches != nil {
			return matches[1], true
		}
	}

	return "", false
}

func getExpiryDate(whoisResponse string) (string, bool) {
	re := regexp.MustCompile(`(?i)Expiry Date:\s*([^\s]+)`)
	scanner := bufio.NewScanner(strings.NewReader(whoisResponse))

	for scanner.Scan() {
		line := scanner.Text()
		if matches := re.FindStringSubmatch(line); matches != nil {
			return matches[1], true
		}
	}

	return "", false
}

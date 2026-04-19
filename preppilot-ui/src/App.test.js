import { render, screen } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes("/problems")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          status: "success",
          data: {
            total: 0,
            problems: [],
          },
        }),
      });
    }

    if (String(url).includes("/analyze")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          status: "success",
          data: {
            topic_count: {},
            minimum_count: 0,
            weak_topics: [],
          },
        }),
      });
    }

    if (String(url).includes("/suggest")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          status: "success",
          data: {
            suggestion: "No data available.",
            prioritized_topic: "",
          },
        }),
      });
    }

    if (String(url).includes("/ai-suggest")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          status: "success",
          data: {
            ai_suggestion: "No data available.",
          },
        }),
      });
    }

    return Promise.resolve({
      ok: true,
      json: async () => ({ status: "success", data: {} }),
    });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("renders PrepPilot heading", async () => {
  render(<App />);
  const heading = await screen.findByText(/preppilot/i);
  expect(heading).toBeInTheDocument();
});

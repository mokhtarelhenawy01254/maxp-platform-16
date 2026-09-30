import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MessageInput from "./MessageInput";

const mockStartRecording = jest.fn();
const mockStopRecording = jest.fn();
const mockClearBlobUrl = jest.fn();

jest.mock("../../../hooks/useAudioRecorder", () => ({
  useAudioRecorder: () => ({
    status: "idle",
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    mediaBlobUrl: null,
    clearBlobUrl: mockClearBlobUrl,
    error: null,
  }),
}));

jest.mock("emoji-picker-react", () => function MockEmojiPicker() {
  return <div data-testid="emoji-picker" />;
});

jest.mock("../QuickReplyDropdown/QuickReplyDropdown", () => function MockQuickReplyDropdown() {
  return <div data-testid="quick-reply-dropdown" />;
});

describe("MessageInput - Voice recording button", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders exactly one voice recording button when input is empty and onSendFile is provided", () => {
    render(
      <MessageInput
        onSendMessage={jest.fn()}
        onSendFile={jest.fn()}
      />
    );

    // There should be only one button with title "تسجيل رسالة صوتية"
    const micButtons = screen.getAllByTitle("تسجيل رسالة صوتية");
    expect(micButtons).toHaveLength(1);

    // Click to start recording
    fireEvent.click(micButtons[0]);
    expect(mockStartRecording).toHaveBeenCalledTimes(1);
  });

  it("switches to send button when message text is entered", () => {
    render(
      <MessageInput
        onSendMessage={jest.fn()}
        onSendFile={jest.fn()}
      />
    );

    // Initially 1 mic button
    expect(screen.queryAllByTitle("تسجيل رسالة صوتية")).toHaveLength(1);
    expect(screen.queryByTitle("إرسال")).not.toBeInTheDocument();

    // Type a message
    const textarea = screen.getByPlaceholderText(/اكتب رسالة/i);
    fireEvent.change(textarea, { target: { value: "مرحبا" } });

    // Mic button is gone, send button is visible
    expect(screen.queryByTitle("تسجيل رسالة صوتية")).not.toBeInTheDocument();
    expect(screen.getByTitle("إرسال")).toBeInTheDocument();
  });
});

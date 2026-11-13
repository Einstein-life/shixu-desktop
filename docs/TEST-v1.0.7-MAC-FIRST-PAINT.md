# Shixu Desktop v1.0.7 — macOS first-frame transparency test

This prerelease follows the author's report that the v1.0.6 Intel build still displayed a white rounded rectangle around the ball on Sequoia 15.7.9.

## Fix and evidence

The white backing was reproduced on macOS 15.7.9 using actual signed applications and desktop screenshots without a debugger. Waiting until the floating window's first frame is ready before showing it removed the white backing in that comparison and preserved transparency through six expansion/collapse cycles. v1.0.7 implements that startup timing fix and respects any hide/show request made while the first frame is pending.

The native Mac build workflow verifies 112 automated tests, packaged source, architecture, ad-hoc signature, DMG/ZIP integrity, startup and synthetic record retention. It additionally checks real desktop screenshots of a normally launched packaged-app copy over a synthetic backdrop, including both languages and repeated resizing. The author's own Intel Mac appearance still needs confirmation.

## Downloads and retest

- Intel Mac: `Shixu-Desktop-1.0.7-mac-x64.dmg` or `.zip`.
- Apple Silicon: `Shixu-Desktop-1.0.7-mac-arm64.dmg` or `.zip`.
- Test release: https://github.com/Einstein-life/shixu-desktop/releases/tag/v1.0.7.

1. Export a JSON backup and completely quit Shixu, including the menu-bar/background instance.
2. Replace the old application at its existing Applications location, then launch the new build. The application identity and data directory are unchanged.
3. Check the ball on the desktop immediately after launch. Switch to Edge, move the pointer away, hover, click, drag and repeat expansion/collapse. Confirm that the surrounding white backing is absent at every stage.
4. Confirm the project/task records, language choice and saved ball position are intact.

This test does not require changing Reduce Transparency or other system settings. If the box remains, report whether it appears at first startup or after a particular interaction.

The stable latest release remains v1.0.5. macOS apps are ad-hoc signed and are not Developer ID signed or notarized.

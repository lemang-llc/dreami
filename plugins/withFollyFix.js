const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Fixes: 'folly/coro/Coroutine.h' file not found.
//
// llama.rn forces C++20 on all pods. With C++20 active, folly
// unconditionally sets FOLLY_HAS_COROUTINES=1 (cannot be overridden
// via -D flags because it's a post-preprocessor #define in a header).
// Expected.h then tries to #include <folly/coro/Coroutine.h>, which
// is not bundled with the ReactNativeDependencies pod.
//
// Fix: inject a Ruby snippet into the existing post_install block that
// creates a stub Coroutine.h in the pods headers directory at pod-install
// time — before Xcode compiles anything. No ordering dependency on the
// llama.rn block.
const withFollyFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (podfile.includes('withFollyFix')) {
        return config;
      }

      // The stub header content (written as a Ruby heredoc).
      // Provides the folly::coro type aliases that Expected.h needs
      // when FOLLY_HAS_COROUTINES=1 with C++20.
      const rubySnippet = `
  # withFollyFix: stub folly/coro/Coroutine.h (missing from ReactNativeDependencies)
  require 'fileutils'
  __stub_dir = File.join(installer.sandbox.root, 'Headers', 'Public', 'ReactNativeDependencies', 'folly', 'coro')
  FileUtils.mkdir_p(__stub_dir)
  __stub_file = File.join(__stub_dir, 'Coroutine.h')
  unless File.exist?(__stub_file)
    File.write(__stub_file, <<~'STUB_HEADER'
      #pragma once
      #if __has_include(<coroutine>)
      #include <coroutine>
      #include <type_traits>
      namespace folly {
      namespace coro {
        template <typename P = void>
        using coroutine_handle = std::coroutine_handle<P>;
        template <typename... A>
        using coroutine_traits = std::coroutine_traits<A...>;
        using suspend_always = std::suspend_always;
        using suspend_never  = std::suspend_never;

        // Detects whether the compiler uses eager return-object conversion
        // for coroutine promise types (a C++20 ABI detail).
        // Conservative default: return false (deferred conversion).
        namespace detail {
          template <typename T>
          struct _return_object_eager {
            static constexpr bool value = false;
          };
        }
        inline constexpr bool detect_promise_return_object_eager_conversion() {
          return false;
        }
      } // namespace coro
      } // namespace folly
      #endif
    STUB_HEADER
    )
  end
`;

      // Insert at the very start of the post_install block body so it
      // runs before any build-setting changes (order doesn't matter for
      // file creation, but this avoids any dependency on llama.rn).
      const marker = 'post_install do |installer|';
      const idx = podfile.indexOf(marker);
      if (idx === -1) {
        console.warn('withFollyFix: could not find post_install block in Podfile');
        return config;
      }

      const insertAt = idx + marker.length;
      podfile =
        podfile.slice(0, insertAt) +
        rubySnippet +
        podfile.slice(insertAt);

      fs.writeFileSync(podfilePath, podfile);
      console.log('withFollyFix: injected folly/coro/Coroutine.h stub into post_install');
      return config;
    },
  ]);
};

module.exports = withFollyFix;

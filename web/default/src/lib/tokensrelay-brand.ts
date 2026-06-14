/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
const TOKENSRELAY_DISPLAY_NAME = '智驿 TokensRelay'
const UNCUSTOMIZED_SYSTEM_NAMES = new Set(['New API', 'new-api'])

export function resolveTokensRelayDisplayName(name?: string | null) {
  const trimmed = name?.trim()
  if (!trimmed || UNCUSTOMIZED_SYSTEM_NAMES.has(trimmed)) {
    return TOKENSRELAY_DISPLAY_NAME
  }
  return trimmed
}

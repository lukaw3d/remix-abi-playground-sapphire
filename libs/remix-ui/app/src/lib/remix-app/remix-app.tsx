import React, { useEffect, useRef, useState } from 'react'
import './style/remix-app.css'
import { RemixUIMainPanel } from '@remix-ui/panel'
import MatomoDialog from './components/modals/matomo'
import EnterDialog from './components/modals/enter'
import OriginWarning from './components/modals/origin-warning'
import DragBar from './components/dragbar/dragbar'
import { AppProvider } from './context/provider'
import AppDialogs from './components/modals/dialogs'
import DialogViewPlugin from './components/modals/dialogViewPlugin'
import { appProviderContextType, onLineContext, platformContext } from './context/context'
import { FormattedMessage, IntlProvider } from 'react-intl'
import { CustomTooltip } from '@remix-ui/helper'
import { UsageTypes } from './types'
import { UniversalDappUI } from '../../../../run-tab/src/lib/components/universalDappUI'
import enJson from '../../../../../../apps/remix-ide/src/app/tabs/locales/en'

declare global {
  interface Window {
    _paq: any
  }
}
const _paq = (window._paq = window._paq || [])

interface IRemixAppUi {
  app: any
}
const RemixApp = (props: IRemixAppUi) => {
  const [appReady, setAppReady] = useState<boolean>(false)
  const [showEnterDialog, setShowEnterDialog] = useState<boolean>(false)
  const [hideSidePanel, setHideSidePanel] = useState<boolean>(false)
  const [maximiseTrigger, setMaximiseTrigger] = useState<number>(0)
  const [resetTrigger, setResetTrigger] = useState<number>(0)
  const [online, setOnline] = useState<boolean>(true)
  const [locale, setLocale] = useState<{ code: string; messages: any }>({
    code: 'en',
    messages: {}
  })
  const sidePanelRef = useRef(null)

  useEffect(() => {
    async function activateApp() {
      props.app.themeModule.initTheme(() => {
        setAppReady(true)
        props.app.activate()
        setListeners()
      })
      setLocale(props.app.localeModule.currentLocale())
    }
    if (props.app) {
      activateApp()
    }
    const hadUsageTypeAsked = localStorage.getItem('hadUsageTypeAsked')
    if (props.app.showMatamo) {
      // if matomo dialog is displayed, it will take care of calling "setShowEnterDialog",
      // if the user approves matomo tracking.
      // so "showEnterDialog" stays false
    } else {
      // if matomo dialog isn't displayed, we show the "enter dialog" only if:
      //  - it wasn't already set
      //  - (and) if user has given consent
      if (!hadUsageTypeAsked && props.app.matomoCurrentSetting) {
        setShowEnterDialog(true)
      }
    }
  }, [])

  function setListeners() {
    props.app.sidePanel.events.on('toggle', () => {
      setHideSidePanel((prev) => {
        return !prev
      })
    })
    props.app.sidePanel.events.on('showing', () => {
      setHideSidePanel(false)
    })

    props.app.layout.event.on('minimizesidepanel', () => {
      // the 'showing' event always fires from sidepanel, so delay this a bit
      setTimeout(() => {
        setHideSidePanel(true)
      }, 1000)
    })

    props.app.layout.event.on('maximisesidepanel', () => {
      setMaximiseTrigger((prev) => {
        return prev + 1
      })
    })

    props.app.layout.event.on('resetsidepanel', () => {
      setResetTrigger((prev) => {
        return prev + 1
      })
    })
    props.app.localeModule.events.on('localeChanged', (nextLocale) => {
      setLocale(nextLocale)
    })

    setInterval(() => {
      setOnline(window.navigator.onLine)
    }, 1000)
  }

  const value: appProviderContextType = {
    settings: props.app.settings,
    showMatamo: props.app.showMatamo,
    appManager: props.app.appManager,
    showEnter: props.app.showEnter,
    modal: props.app.notification
  }

  const handleUserChosenType = async (type) => {
    setShowEnterDialog(false)
    localStorage.setItem('hadUsageTypeAsked', type)

    // Use the type to setup the UI accordingly
    switch (type) {
    case UsageTypes.Beginner: {
      await props.app.appManager.call('manager', 'activatePlugin', 'LearnEth')
      await props.app.appManager.call('walkthrough', 'start')
      // const wName = 'Playground'
      // const workspaces = await props.app.appManager.call('filePanel', 'getWorkspaces')
      // if (!workspaces.find((workspace) => workspace.name === wName)) {
      //   await props.app.appManager.call('filePanel', 'createWorkspace', wName, 'playground')
      // }
      // await props.app.appManager.call('filePanel', 'switchToWorkspace', { name: wName, isLocalHost: false })

      _paq.push(['trackEvent', 'enterDialog', 'usageType', 'beginner'])
      break
    }
    case UsageTypes.Advance: {
      _paq.push(['trackEvent', 'enterDialog', 'usageType', 'advanced'])
      break
    }
    case UsageTypes.Prototyper: {
      _paq.push(['trackEvent', 'enterDialog', 'usageType', 'prototyper'])
      break
    }
    case UsageTypes.Production: {
      _paq.push(['trackEvent', 'enterDialog', 'usageType', 'production'])
      break
    }
    default: throw new Error()
    }

  }

  return (
    //@ts-ignore
    <IntlProvider locale={locale.code} messages={locale.messages}>
      <platformContext.Provider value={props.app.platform}>
        <onLineContext.Provider value={online}>
          <AppProvider value={value}>
            <OriginWarning></OriginWarning>
            <MatomoDialog hide={!appReady} okFn={() => setShowEnterDialog(true)}></MatomoDialog>
            {showEnterDialog && <EnterDialog handleUserChoice={(type) => handleUserChosenType(type)}></EnterDialog>}
            <div className={`remixIDE ${appReady ? '' : 'd-none'}`} data-id="remixIDE">
              <div id="icon-panel" data-id="remixIdeIconPanel" className="custom_icon_panel iconpanel bg-light">
                {props.app.menuicons.render()}
              </div>
              <div
                ref={sidePanelRef}
                id="side-panel"
                data-id="remixIdeSidePanel"
                className={`sidepanel border-right border-left ${hideSidePanel ? 'd-none' : ''}`}
              >
                {props.app.sidePanel.render()}
              </div>
              <DragBar
                resetTrigger={resetTrigger}
                maximiseTrigger={maximiseTrigger}
                minWidth={285}
                refObject={sidePanelRef}
                hidden={hideSidePanel}
                setHideStatus={setHideSidePanel}
              ></DragBar>
              <div id="main-panel" data-id="remixIdeMainPanel" className="mainpanel d-flex">
                <RemixUIMainPanel layout={props.app.layout}></RemixUIMainPanel>
                <CustomTooltip placement="bottom" tooltipId="overlay-tooltip-all-tabs" tooltipText={<FormattedMessage id="remixApp.scrollToSeeAllTabs" />}>
                  <div className="remix-ui-tabs_end remix-bg-opacity position-absolute position-fixed"></div>
                </CustomTooltip>
              </div>
            </div>
            <div>{props.app.hiddenPanel.render()}</div>
            <AppDialogs></AppDialogs>
            <DialogViewPlugin></DialogViewPlugin>
          </AppProvider>
        </onLineContext.Provider>
      </platformContext.Provider>
    </IntlProvider>
  )
}

function MyRun(props: IRemixAppUi) {
  const locale = props.app.localeModule.currentLocale()
  return (
    <IntlProvider locale={locale.code} messages={locale.messages}>
      <UniversalDappUI
        instance={{
          "abi": [
            {
              "inputs": [
                {
                  "internalType": "bool",
                  "name": "_booleanValue",
                  "type": "bool"
                },
                {
                  "internalType": "int256",
                  "name": "_integerValue",
                  "type": "int256"
                },
                {
                  "internalType": "uint256",
                  "name": "_unsignedIntegerValue",
                  "type": "uint256"
                },
                {
                  "internalType": "address",
                  "name": "_addr",
                  "type": "address"
                },
                {
                  "internalType": "bytes32",
                  "name": "_b32",
                  "type": "bytes32"
                },
                {
                  "internalType": "string",
                  "name": "_str",
                  "type": "string"
                }
              ],
              "name": "emitEvent1",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            },
            {
              "inputs": [
                {
                  "internalType": "uint256[]",
                  "name": "_uintArray",
                  "type": "uint256[]"
                },
                {
                  "components": [
                    {
                      "internalType": "string",
                      "name": "a",
                      "type": "string"
                    },
                    {
                      "components": [
                        {
                          "internalType": "uint16",
                          "name": "c",
                          "type": "uint16"
                        },
                        {
                          "internalType": "uint16[2]",
                          "name": "d",
                          "type": "uint16[2]"
                        }
                      ],
                      "internalType": "struct TryEmitTypes.structCd",
                      "name": "c",
                      "type": "tuple"
                    }
                  ],
                  "internalType": "struct TryEmitTypes.structAb",
                  "name": "_structAb1",
                  "type": "tuple"
                }
              ],
              "name": "emitEvent2",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            },
            {
              "inputs": [
                {
                  "internalType": "uint16[2]",
                  "name": "",
                  "type": "uint16[2]"
                },
                {
                  "internalType": "uint16",
                  "name": "",
                  "type": "uint16"
                }
              ],
              "name": "emitUnnamed",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            },
            {
              "anonymous": false,
              "inputs": [
                {
                  "indexed": true,
                  "internalType": "uint16",
                  "name": "",
                  "type": "uint16"
                },
                {
                  "indexed": false,
                  "internalType": "uint16",
                  "name": "",
                  "type": "uint16"
                }
              ],
              "name": "TestUnnamed",
              "type": "event"
            },
            {
              "anonymous": false,
              "inputs": [
                {
                  "indexed": true,
                  "internalType": "bool",
                  "name": "booleanValue",
                  "type": "bool"
                },
                {
                  "indexed": true,
                  "internalType": "int256",
                  "name": "integerValue",
                  "type": "int256"
                },
                {
                  "indexed": true,
                  "internalType": "uint256",
                  "name": "unsignedIntegerValue",
                  "type": "uint256"
                },
                {
                  "indexed": false,
                  "internalType": "address",
                  "name": "addr",
                  "type": "address"
                },
                {
                  "indexed": false,
                  "internalType": "bytes32",
                  "name": "b32",
                  "type": "bytes32"
                },
                {
                  "indexed": false,
                  "internalType": "string",
                  "name": "str",
                  "type": "string"
                }
              ],
              "name": "TryEmitTypesEvent1",
              "type": "event"
            },
            {
              "anonymous": false,
              "inputs": [
                {
                  "indexed": false,
                  "internalType": "uint256[]",
                  "name": "uintArray",
                  "type": "uint256[]"
                },
                {
                  "components": [
                    {
                      "internalType": "string",
                      "name": "a",
                      "type": "string"
                    },
                    {
                      "components": [
                        {
                          "internalType": "uint16",
                          "name": "c",
                          "type": "uint16"
                        },
                        {
                          "internalType": "uint16[2]",
                          "name": "d",
                          "type": "uint16[2]"
                        }
                      ],
                      "internalType": "struct TryEmitTypes.structCd",
                      "name": "c",
                      "type": "tuple"
                    }
                  ],
                  "indexed": false,
                  "internalType": "struct TryEmitTypes.structAb",
                  "name": "structAb1",
                  "type": "tuple"
                }
              ],
              "name": "TryEmitTypesEvent2",
              "type": "event"
            }
          ],
          // @ts-expect-error
          "contractData": {
            "name": "TryEmitTypes",
            "contract": {
              "object": {
                "abi": [
                  {
                    "inputs": [
                      {
                        "internalType": "bool",
                        "name": "_booleanValue",
                        "type": "bool"
                      },
                      {
                        "internalType": "int256",
                        "name": "_integerValue",
                        "type": "int256"
                      },
                      {
                        "internalType": "uint256",
                        "name": "_unsignedIntegerValue",
                        "type": "uint256"
                      },
                      {
                        "internalType": "address",
                        "name": "_addr",
                        "type": "address"
                      },
                      {
                        "internalType": "bytes32",
                        "name": "_b32",
                        "type": "bytes32"
                      },
                      {
                        "internalType": "string",
                        "name": "_str",
                        "type": "string"
                      }
                    ],
                    "name": "emitEvent1",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                  },
                  {
                    "inputs": [
                      {
                        "internalType": "uint256[]",
                        "name": "_uintArray",
                        "type": "uint256[]"
                      },
                      {
                        "components": [
                          {
                            "internalType": "string",
                            "name": "a",
                            "type": "string"
                          },
                          {
                            "components": [
                              {
                                "internalType": "uint16",
                                "name": "c",
                                "type": "uint16"
                              },
                              {
                                "internalType": "uint16[2]",
                                "name": "d",
                                "type": "uint16[2]"
                              }
                            ],
                            "internalType": "struct TryEmitTypes.structCd",
                            "name": "c",
                            "type": "tuple"
                          }
                        ],
                        "internalType": "struct TryEmitTypes.structAb",
                        "name": "_structAb1",
                        "type": "tuple"
                      }
                    ],
                    "name": "emitEvent2",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                  },
                  {
                    "inputs": [
                      {
                        "internalType": "uint16[2]",
                        "name": "",
                        "type": "uint16[2]"
                      },
                      {
                        "internalType": "uint16",
                        "name": "",
                        "type": "uint16"
                      }
                    ],
                    "name": "emitUnnamed",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                  },
                  {
                    "anonymous": false,
                    "inputs": [
                      {
                        "indexed": true,
                        "internalType": "uint16",
                        "name": "",
                        "type": "uint16"
                      },
                      {
                        "indexed": false,
                        "internalType": "uint16",
                        "name": "",
                        "type": "uint16"
                      }
                    ],
                    "name": "TestUnnamed",
                    "type": "event"
                  },
                  {
                    "anonymous": false,
                    "inputs": [
                      {
                        "indexed": true,
                        "internalType": "bool",
                        "name": "booleanValue",
                        "type": "bool"
                      },
                      {
                        "indexed": true,
                        "internalType": "int256",
                        "name": "integerValue",
                        "type": "int256"
                      },
                      {
                        "indexed": true,
                        "internalType": "uint256",
                        "name": "unsignedIntegerValue",
                        "type": "uint256"
                      },
                      {
                        "indexed": false,
                        "internalType": "address",
                        "name": "addr",
                        "type": "address"
                      },
                      {
                        "indexed": false,
                        "internalType": "bytes32",
                        "name": "b32",
                        "type": "bytes32"
                      },
                      {
                        "indexed": false,
                        "internalType": "string",
                        "name": "str",
                        "type": "string"
                      }
                    ],
                    "name": "TryEmitTypesEvent1",
                    "type": "event"
                  },
                  {
                    "anonymous": false,
                    "inputs": [
                      {
                        "indexed": false,
                        "internalType": "uint256[]",
                        "name": "uintArray",
                        "type": "uint256[]"
                      },
                      {
                        "components": [
                          {
                            "internalType": "string",
                            "name": "a",
                            "type": "string"
                          },
                          {
                            "components": [
                              {
                                "internalType": "uint16",
                                "name": "c",
                                "type": "uint16"
                              },
                              {
                                "internalType": "uint16[2]",
                                "name": "d",
                                "type": "uint16[2]"
                              }
                            ],
                            "internalType": "struct TryEmitTypes.structCd",
                            "name": "c",
                            "type": "tuple"
                          }
                        ],
                        "indexed": false,
                        "internalType": "struct TryEmitTypes.structAb",
                        "name": "structAb1",
                        "type": "tuple"
                      }
                    ],
                    "name": "TryEmitTypesEvent2",
                    "type": "event"
                  }
                ],
                "devdoc": {
                  "kind": "dev",
                  "methods": {},
                  "version": 1
                },
                "evm": {
                  "gasEstimates": {
                    "creation": {
                      "codeDepositCost": "467400",
                      "executionCost": "503",
                      "totalCost": "467903"
                    },
                    "external": {
                      "emitEvent1(bool,int256,uint256,address,bytes32,string)": "infinite",
                      "emitEvent2(uint256[],(string,(uint16,uint16[2])))": "infinite",
                      "emitUnnamed(uint16[2],uint16)": "infinite"
                    }
                  },
                  "methodIdentifiers": {
                    "emitEvent1(bool,int256,uint256,address,bytes32,string)": "fd9a4262",
                    "emitEvent2(uint256[],(string,(uint16,uint16[2])))": "19d0fd30",
                    "emitUnnamed(uint16[2],uint16)": "1f1e626c"
                  }
                },
                "storageLayout": {
                  "storage": [],
                  "types": null
                },
                "userdoc": {
                  "kind": "user",
                  "methods": {},
                  "version": 1
                }
              },
              "file": "TryEmitTypes.sol"
            },
            "compiler": {
              "languageversion": "soljson",
              "data": {
                "contracts": {
                  "TryEmitTypes.sol": {}
                },
                "sources": {
                  "TryEmitTypes.sol": {
                    "ast": {
                      "absolutePath": "TryEmitTypes.sol",
                      "exportedSymbols": {
                        "TryEmitTypes": [
                          98
                        ]
                      },
                      "id": 99,
                      "license": "Unlicense",
                      "nodeType": "SourceUnit",
                      "src": "38:1483:0"
                    },
                    "id": 0
                  }
                }
              },
              "source": {
                "sources": {
                  "TryEmitTypes.sol": {
                  }
                },
                "target": "TryEmitTypes.sol"
              },
            },
          },
          "address": "0xEF15601B599F5C0696E38AB27f100c4075B36150",
          "name": "TryEmitTypes",
          "decodedResponse": {},
          "balance": 0
        }}
        isPinnedContract={false}
        context={"blockchain"}
        removeInstance={() => {
          console.log("removeInstance")
          return <>removeInstance</>
        }}
        index={0}
        gasEstimationPrompt={() => {
          console.log("gasEstimationPrompt")
          return <>gasEstimationPrompt</>
        }}
        passphrasePrompt={() => {
          console.log("passphrasePrompt")
          return <>passphrasePrompt</>
        }}
        mainnetPrompt={() => {
          console.log("mainnetPrompt")
          return <>mainnetPrompt</>
        }}
        runTransactions={(...args) => {
          console.log("runTransactions", args)
          return <>runTransactions</>
        }}
        // would come from section above
        sendValue={"0"}
        getFuncABIInputs={() => {
          console.log("getFuncABIValues")
          return 'getFuncABIValues'
        }}
        // @ts-expect-error
        plugin={{
          REACT_API: {
            chainId: 'plugin.REACT_API.chainId'
          },
          call: async (...args) => console.log(args),
        }}
        exEnvironment={"injected-MetaMask"}
        editInstance={() => {
          console.log("editInstance")
          return <>editInstance</>
        }}
      />
    </IntlProvider>
  )
}

// export default MyRun
export default RemixApp

import "azure-devops-ui/Core/override.css";
import "./preview.scss";

import * as SDK from "azure-devops-extension-sdk";
import { Header } from "azure-devops-ui/Header";
import { Page } from "azure-devops-ui/Page";
import { SurfaceBackground, SurfaceContext } from "azure-devops-ui/Surface";

import { CommonServiceIds, IHostNavigationService, IHostPageLayoutService, IExtensionDataManager, IExtensionDataService  } from "azure-devops-extension-api";

import * as React from "react";

import * as ReactDOM from "react-dom";

import IecViewer from "./iecviewer";

 
export interface IPreviewState {
    xml? : XMLDocument;
}

class PreviewContent extends React.Component<{}, IPreviewState> {

    private _dataManager?: IExtensionDataManager;

    constructor(props: {}) {
        super(props);
        this.state = {};
    }

    public componentDidMount() { 
        this.initializeState();
    }

    private async initializeState(): Promise<void> {
        await SDK.init();
        await SDK.ready();
        const fileContent = SDK.getConfiguration().content;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(fileContent, "text/xml");
        this.setState({ xml : xmlDoc });
    }

    public render(): JSX.Element {
        const { xml } = this.state;
        const iframeUrl = window.location.href;
        return (
            <SurfaceContext.Provider value={{ background: SurfaceBackground.normal }}>
                <Page className="tc-preview-page absolute-fill">
                    <div className="page-content">
                        <IecViewer xml={xml} />
                    </div>
                </Page>
            </SurfaceContext.Provider>
        );
    }
}
ReactDOM.render(<PreviewContent />, document.getElementById("root"));

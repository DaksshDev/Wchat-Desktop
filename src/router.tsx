import { FC } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { IndexPage } from "./pages";
import { PopupPage } from "./pages/popup";
import { NotificationPage }  from "./pages/notification";
import { AppPage } from "./pages/App";
import { OfflinePage } from "./pages/OfflinePage";

export const Router: FC = () => {
	return (
		<HashRouter>
			<Routes>
				<Route path="./">
					<Route index element={<IndexPage />} />
					<Route path="index" element={<IndexPage />} />
					<Route path="popup" element={<PopupPage />} />
					<Route path="notification" element={<NotificationPage />} />
					<Route path="Offline" element={<OfflinePage />} />
					<Route path="App" element={<AppPage />} />
				</Route>
			</Routes>
		</HashRouter>
	);
};
